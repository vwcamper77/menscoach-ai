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
import { resolveSessionId, setSessionIdCookie, sanitizeSessionId } from "@/lib/sessionId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "free" | "starter" | "pro" | "elite";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function isPaidPlan(plan: unknown): plan is Plan {
  const v = typeof plan === "string" ? plan.trim().toLowerCase() : "";
  return v === "starter" || v === "pro" || v === "elite";
}

function coercePlan(value: unknown): Plan {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "starter" || v === "pro" || v === "elite") return v as Plan;
  return "free";
}

function isPaidDoc(doc: Record<string, unknown> | null | undefined) {
  if (!doc) return false;
  const plan = typeof doc.plan === "string" ? doc.plan.trim().toLowerCase() : null;
  const hasStripeCustomerId =
    typeof doc.stripeCustomerId === "string" && doc.stripeCustomerId.trim().length > 0;
  return (plan !== null && plan !== "free") || hasStripeCustomerId;
}

async function findPaidSessionIdByStripeEmail(
  db: FirebaseFirestore.Firestore,
  email: string
): Promise<string | null> {
  const emailLower = email.toLowerCase().trim();
  if (!emailLower) return null;

  const customers = await stripe.customers.list({ email: emailLower, limit: 10 });
  if (!customers.data.length) return null;

  for (const c of customers.data) {
    const qs = await db
      .collection("mc_users")
      .where("stripeCustomerId", "==", c.id)
      .limit(5)
      .get();

    if (qs.empty) continue;

    const docs = qs.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
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

  const resolution = resolveSessionId(req, { allowHeader: true, generateIfMissing: true });
  if (!resolution) throw new Error("Unable to resolve session id");

  const {
    sessionId: initialSessionIdRaw,
    cookieSessionId: cookieSessionIdRaw,
    shouldSetCookie: resolverSetCookie,
  } = resolution;

  // Canonicalize ids ONCE
  const initialSessionId = sanitizeSessionId(initialSessionIdRaw);
  const cookieSessionId = cookieSessionIdRaw ? sanitizeSessionId(cookieSessionIdRaw) : null;

  let finalSessionId = initialSessionId;
  let shouldSetCookie = resolverSetCookie;

  let cookieDocData: Record<string, unknown> | null = null;
  if (cookieSessionId) {
    const cookieSnap = await db.collection("mc_users").doc(cookieSessionId).get();
    cookieDocData = cookieSnap.exists ? (cookieSnap.data() as Record<string, unknown>) : null;
  }

  if (email) {
    let linkedSessionId = await getLinkedSessionId(email);
    if (linkedSessionId) {
      linkedSessionId = sanitizeSessionId(linkedSessionId);

      const linkedSnap = await db.collection("mc_users").doc(linkedSessionId).get();
      if (linkedSnap.exists) {
        const linkedDoc = linkedSnap.data() as Record<string, unknown>;
        const cookiePaid = isPaidDoc(cookieDocData);
        const linkedPaid = isPaidDoc(linkedDoc);

        if (cookiePaid && !linkedPaid && cookieSessionId) {
          finalSessionId = cookieSessionId;
        } else if (!cookiePaid && linkedPaid) {
          finalSessionId = linkedSessionId;
        } else if (cookiePaid && linkedPaid && cookieSessionId) {
          finalSessionId = cookieSessionId;
        } else if (!cookieSessionId) {
          finalSessionId = linkedSessionId;
        }
      } else {
        await unlinkEmailSession(email);
      }
    }
  }

  if (email) {
    const currentSnap = await db.collection("mc_users").doc(finalSessionId).get();
    const currentDoc = currentSnap.exists ? (currentSnap.data() as Record<string, unknown>) : null;

    if (!isPaidDoc(currentDoc)) {
      const stripePaidSessionId = await findPaidSessionIdByStripeEmail(db, email);
      if (stripePaidSessionId) {
        const stripeDocId = sanitizeSessionId(stripePaidSessionId);
        if (stripeDocId !== finalSessionId) finalSessionId = stripeDocId;
      }
    }
  }

  if (cookieSessionId && finalSessionId !== cookieSessionId) {
    shouldSetCookie = true;
  }

  // Ensure user exists (writes only to sanitized id internally too)
  await getOrCreateUser(finalSessionId);

  // IMPORTANT: write auth fields to the SAME canonical doc id
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

  const plan = isPaidPlan(user?.plan) ? (user.plan as Plan) : coercePlan(user?.plan);

  console.log("api/me:doc state", {
    docId: finalSessionId,
    existed: snap.exists,
    planRead: user?.plan ?? null,
    returningPlan: plan,
  });

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

  if (shouldSetCookie) setSessionIdCookie(res, finalSessionId);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}
