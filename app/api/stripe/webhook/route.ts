import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getFirestore } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Plan = "free" | "starter" | "pro" | "elite";

function planFromMetadata(value: unknown): Plan | null {
  if (value === "starter" || value === "pro" || value === "elite") return value;
  return null;
}

async function setUserPlanBySessionId(sessionId: string, updates: Record<string, any>) {
  const db = getFirestore();

  // IMPORTANT: mc_users doc id should be the real sessionId used everywhere else
  await db.collection("mc_users").doc(sessionId).set(
    {
      ...updates,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

async function setUserPlanByCustomerId(customerId: string, updates: Record<string, any>) {
  const db = getFirestore();

  const snap = await db
    .collection("mc_users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (snap.empty) return;

  await snap.docs[0].ref.set(
    {
      ...updates,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Missing stripe-signature header" } },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: { code: "SERVER_MISCONFIG", message: "Missing STRIPE_WEBHOOK_SECRET" } },
      { status: 500 }
    );
  }

  let event: any;

  try {
    const body = await req.text(); // must be raw
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err?.message || err);
    return NextResponse.json(
      { error: { code: "INVALID_SIGNATURE", message: "Webhook signature verification failed" } },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;

      const sessionId =
        typeof session?.metadata?.sessionId === "string" ? session.metadata.sessionId : null;
      const plan = planFromMetadata(session?.metadata?.plan);

      if (sessionId && plan) {
        await setUserPlanBySessionId(sessionId, {
          plan,
          stripeCustomerId: session.customer ?? null,
          stripeSubscriptionId: session.subscription ?? null,
        });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as any;

      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        await setUserPlanByCustomerId(customerId, {
          stripeSubscriptionStatus: sub.status ?? null,
          stripeCurrentPeriodEnd: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;

      const customerId = typeof sub.customer === "string" ? sub.customer : null;
      if (customerId) {
        await setUserPlanByCustomerId(customerId, {
          plan: "free",
          stripeSubscriptionStatus: sub.status ?? "canceled",
        });
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("Stripe webhook handler error:", err?.message || err);
    return NextResponse.json(
      { error: { code: "WEBHOOK_HANDLER_ERROR", message: "Webhook handler failed" } },
      { status: 500 }
    );
  }
}
