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
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

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

async function findPaidSessionIdByStripeEmail(
  db: FirebaseFirestore.Firestore,
  email: string
): Promise<string | null> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return null;

  // Try Stripe customers by email. Prefer the most recently created one.
  // customers.list supports { email } filter.
  const customers = await stripe.customers.list({ email: emailLower, limit: 10 });

  if (!customers.data.length) return null;

  // For each customer, see if we have a mc_users doc tied to stripeCustomerId
  for (const c of customers.data) {
    const qs = await db
      .collection("mc_users")
      .where("stripeCustomerId", "==", c.id)
      .limit(5)
      .get();

    if (qs.empty) continue;

    // Prefer a paid doc among matches
    const docs = qs.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, any> }));
    const paid = docs.find((x) => isPaidDoc(x.data));
    return (paid ?? docs[0]).id;
  }

  return null;
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

  // 1) Resolve via link table (your existing logic)
  if (email) {
    let linkedSessionId = await getLinkedSessionId(email);

    if (linkedSessionId) {
      const linkedSnap = await db.collection("mc_users").doc(linkedSessionId).get();
      if (linkedSnap.exists) {
        const canonicalDoc = linkedSnap.data() as Record<string, any>;

        if (cookieSessionId && linkedSessionId !== cookieSessionId) {
          if (isPaidDoc(cookieDocData) && !isPaidDoc(canonicalDoc)) {
            finalSessionId = cookieSessionId;
          } else {
            finalSessionId = linkedSessionId;
          }
        } else {
          finalSessionId = linkedSessionId;
        }
      } else {
        await unlinkEmailSession(email);
        linkedSessionId = null;
      }
    }
  }

  // 2) Stripe recovery (THIS is the missing piece)
  // If we are logged in but we are still on a free doc, try to recover paid doc via Stripe customer email.
  if (email) {
    const currentSnap = await db.collection("mc_users").doc(finalSessionId).get();
    const currentDoc = currentSnap.exists ? (currentSnap.data() as Record<string, any>) : null;

    if (!isPaidDoc(currentDoc)) {
      const stripePaidSessionId = await findPaidSessionIdByStripeEmail(db, email);
      if (stripePaidSessionId && stripePaidSessionId !== finalSessionId) {
        finalSessionId = stripePaidSessionId;
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
