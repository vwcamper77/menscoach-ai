// app/api/me/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { getEntitlements } from "@/lib/entitlements";
import { getDailyUsage } from "@/lib/usage";
import { getOrCreateUser } from "@/lib/users";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/auth";
import {
  getLinkedSessionId,
  linkEmailToSession,
  unlinkEmailSession,
} from "@/lib/sessionLink";

// MUST match your session + checkout cookies.
const COOKIE_NAME = "mc_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

type Plan = "free" | "starter" | "pro" | "elite";

function safeSessionId(sessionId: string) {
  return sessionId.replaceAll("/", "_");
}

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function readCookieSessionId(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME)?.value ?? null;
  return raw ? safeSessionId(raw) : null;
}

function coercePlan(value: any): Plan {
  if (value === "starter" || value === "pro" || value === "elite") return value;
  return "free";
}

function isPaidDoc(doc: Record<string, any> | null | undefined) {
  const plan = doc?.plan;
  return typeof plan === "string" && plan !== "free";
}

function pickMostRecentDoc(
  a: { id: string; data: Record<string, any> },
  b: { id: string; data: Record<string, any> }
) {
  const aUpdated = a.data?.updatedAt?.toDate?.() ?? a.data?.updatedAt ?? a.data?.createdAt?.toDate?.() ?? a.data?.createdAt ?? null;
  const bUpdated = b.data?.updatedAt?.toDate?.() ?? b.data?.updatedAt ?? b.data?.createdAt?.toDate?.() ?? b.data?.createdAt ?? null;

  const aTime = aUpdated instanceof Date ? aUpdated.getTime() : (typeof aUpdated === "number" ? aUpdated : 0);
  const bTime = bUpdated instanceof Date ? bUpdated.getTime() : (typeof bUpdated === "number" ? bUpdated : 0);

  return bTime > aTime ? b : a;
}

/**
 * When a user is authenticated, we should be able to recover the canonical
 * mc_users record even if the cookie or mc_user_links are out of sync.
 *
 * We look for documents by authEmail (preferred) and email (fallback),
 * then prefer paid docs, else most recently updated.
 */
async function findBestMcUserSessionIdByEmail(
  db: FirebaseFirestore.Firestore,
  email: string
): Promise<string | null> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return null;

  const found: Array<{ id: string; data: Record<string, any> }> = [];

  // Query 1: authEmail == email
  try {
    const qs1 = await db
      .collection("mc_users")
      .where("authEmail", "==", emailLower)
      .limit(20)
      .get();

    qs1.forEach((d) => found.push({ id: d.id, data: d.data() as Record<string, any> }));
  } catch {
    // ignore
  }

  // Query 2: email == email (in case you store it this way)
  try {
    const qs2 = await db
      .collection("mc_users")
      .where("email", "==", emailLower)
      .limit(20)
      .get();

    qs2.forEach((d) => {
      if (!found.some((x) => x.id === d.id)) {
        found.push({ id: d.id, data: d.data() as Record<string, any> });
      }
    });
  } catch {
    // ignore
  }

  if (found.length === 0) return null;

  // Prefer any paid doc
  const paid = found.filter((x) => isPaidDoc(x.data));
  if (paid.length > 0) {
    // If multiple paid docs exist, take the most recently updated
    return paid.reduce((acc, cur) => pickMostRecentDoc(acc, cur)).id;
  }

  // Otherwise, take most recent overall
  return found.reduce((acc, cur) => pickMostRecentDoc(acc, cur)).id;
}

export async function GET(req: NextRequest) {
  const db = getFirestore();

  const session = (await getServerSession(authOptions)) as Session | null;
  const emailRaw = session?.user?.email ?? null;
  const email = emailRaw ? String(emailRaw).toLowerCase().trim() : null;

  const cookieSessionId = readCookieSessionId(req);
  const fallbackSessionId = safeSessionId(crypto.randomUUID());
  const cookieCandidate = cookieSessionId ?? fallbackSessionId;

  let finalSessionId = cookieCandidate;
  let shouldSetCookie = !cookieSessionId;

  let cookieDocData: Record<string, any> | null = null;
  if (cookieSessionId) {
    const cookieSnap = await db.collection("mc_users").doc(cookieSessionId).get();
    cookieDocData = cookieSnap.exists ? (cookieSnap.data() as Record<string, any>) : null;
  }

  // 1) If user is logged in, attempt to resolve their canonical session
  if (email) {
    // A) Try the existing link table first
    let linkedSessionId = await getLinkedSessionId(email);

    if (linkedSessionId) {
      const linkedSnap = await db.collection("mc_users").doc(linkedSessionId).get();
      if (linkedSnap.exists) {
        const canonicalDoc = linkedSnap.data() as Record<string, any>;

        if (cookieSessionId && linkedSessionId !== cookieSessionId) {
          // Prefer paid doc if there is a mismatch
          if (isPaidDoc(cookieDocData) && !isPaidDoc(canonicalDoc)) {
            finalSessionId = cookieSessionId;
          } else {
            finalSessionId = linkedSessionId;
          }
        } else {
          finalSessionId = linkedSessionId;
        }
      } else {
        // Stale link, remove it
        await unlinkEmailSession(email);
        linkedSessionId = null;
      }
    }

    // B) Safety net: search mc_users by authEmail/email, prefer paid
    // This fixes the exact situation you are in: paid doc exists, but link/cookie points elsewhere.
    const bestByEmail = await findBestMcUserSessionIdByEmail(db, email);
    if (bestByEmail) {
      const bestSnap = await db.collection("mc_users").doc(bestByEmail).get();
      const bestDoc = bestSnap.exists ? (bestSnap.data() as Record<string, any>) : null;

      const currentSnap = await db.collection("mc_users").doc(finalSessionId).get();
      const currentDoc = currentSnap.exists ? (currentSnap.data() as Record<string, any>) : null;

      // Prefer paid, else prefer whatever is "bestByEmail"
      if (isPaidDoc(bestDoc) && !isPaidDoc(currentDoc)) {
        finalSessionId = bestByEmail;
      } else if (!currentDoc) {
        finalSessionId = bestByEmail;
      }
    }
  }

  if (cookieSessionId && finalSessionId !== cookieSessionId) {
    shouldSetCookie = true;
  }

  // Ensure user doc exists
  await getOrCreateUser(finalSessionId);

  // Attach auth info and link email -> finalSessionId
  if (email) {
    const authUserId = (session?.user as any)?.id ?? null;

    await linkEmailToSession(email, finalSessionId, authUserId);

    await db.collection("mc_users").doc(finalSessionId).set(
      {
        authEmail: email,
        authUserId: authUserId,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  const snap = await db.collection("mc_users").doc(finalSessionId).get();
  const user = snap.exists ? (snap.data() as any) : {};

  const plan = coercePlan(user?.plan);
  const entitlements = getEntitlements(plan);
  const usage = await getDailyUsage(finalSessionId, utcDateKey());

  const res = NextResponse.json({
    sessionId: finalSessionId,
    email,
    plan,
    entitlements,
    usage,
    profile: {
      onboardingComplete: Boolean(user?.onboardingComplete),
      onboardingSkipped: Boolean(user?.onboardingSkipped),
      name: user?.name ?? "",
      primaryFocus: user?.primaryFocus ?? "",
      preferredMode: user?.preferredMode ?? "direct",
      goal30: user?.goal30 ?? "",
    },
    stripe: {
      customerId: user?.stripeCustomerId ?? null,
      subscriptionId: user?.stripeSubscriptionId ?? null,
      status: user?.stripeSubscriptionStatus ?? null,
      currentPeriodEnd: user?.stripeCurrentPeriodEnd ?? null,
    },
  });

  if (shouldSetCookie) {
    res.cookies.set(COOKIE_NAME, finalSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return res;
}
