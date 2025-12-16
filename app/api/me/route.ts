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
import { resolveSessionId, setSessionIdCookie } from "@/lib/sessionId";

type Plan = "free" | "starter" | "pro" | "elite";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function coercePlan(value: any): Plan {
  if (value === "starter" || value === "pro" || value === "elite") return value;
  return "free";
}

function isPaidDoc(doc: Record<string, any> | null | undefined) {
  if (!doc) return false;
  const plan = typeof doc.plan === "string" ? doc.plan : null;
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

  const resolution = resolveSessionId(req, { allowHeader: true, generateIfMissing: true });
  if (!resolution) {
    throw new Error("Unable to resolve session id");
  }

  const { sessionId: initialSessionId, cookieSessionId, shouldSetCookie: resolverSetCookie } = resolution;

  let finalSessionId = initialSessionId;
  let shouldSetCookie = resolverSetCookie;

  let cookieDocData: Record<string, any> | null = null;
  if (cookieSessionId) {
    const cookieSnap = await db.collection("mc_users").doc(cookieSessionId).get();
    cookieDocData = cookieSnap.exists ? (cookieSnap.data() as Record<string, any>) : null;
  }

  if (email) {
    let linkedSessionId = await getLinkedSessionId(email);

    if (linkedSessionId) {
      const linkedSnap = await db.collection("mc_users").doc(linkedSessionId).get();
      if (linkedSnap.exists) {
        const linkedDoc = linkedSnap.data() as Record<string, any>;
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
        linkedSessionId = null;
      }
    }
  }

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

  await getOrCreateUser(finalSessionId);

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
    setSessionIdCookie(res, finalSessionId);
  }

  return res;
}
