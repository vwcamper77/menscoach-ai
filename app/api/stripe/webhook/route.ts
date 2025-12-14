import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getFirestore } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Plan = "free" | "starter" | "pro" | "elite";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Price → plan mapping from env
const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
  [process.env.STRIPE_PRICE_ELITE ?? ""]: "elite",
};

function safeSessionId(sessionId: string) {
  return sessionId.replaceAll("/", "_");
}

function planFromPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  const plan = PRICE_TO_PLAN[priceId];
  return plan ?? null;
}

async function updateUserPlan(opts: {
  sessionId: string;
  plan?: Plan;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const { sessionId, plan, customerId, subscriptionId, status, currentPeriodEnd } = opts;
  const db = getFirestore();
  const docId = safeSessionId(sessionId);

  const patch: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (plan) patch.plan = plan;
  if (customerId !== undefined) patch.stripeCustomerId = customerId ?? null;
  if (subscriptionId !== undefined) patch.stripeSubscriptionId = subscriptionId ?? null;
  if (status !== undefined) patch.stripeSubscriptionStatus = status ?? null;
  if (currentPeriodEnd !== undefined) patch.stripeCurrentPeriodEnd = currentPeriodEnd ?? null;

  await db.collection("mc_users").doc(docId).set(patch, { merge: true });
}

function getSessionIdFromMetadata(
  obj: { metadata?: Record<string, any> } & { client_reference_id?: string | null }
): string | null {
  const meta = obj.metadata ?? {};
  return (
    (meta.sessionId as string) ||
    (meta.session_id as string) ||
    (meta.client_reference_id as string) ||
    (obj.client_reference_id as string) ||
    null
  );
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const sessionId = getSessionIdFromMetadata(session);
  if (!sessionId) {
    console.error("Stripe webhook: missing sessionId on checkout.session.completed");
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let plan = (session.metadata?.plan as Plan) ?? null;
  let status: string | null = null;
  let currentPeriodEnd: number | null = null;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    status = subscription.status ?? null;
    currentPeriodEnd = subscription.current_period_end
      ? subscription.current_period_end * 1000
      : null;
    if (!plan) {
      plan = planFromPrice(subscription.items.data[0]?.price?.id) ?? plan;
    }
  }

  if (plan) {
    await updateUserPlan({
      sessionId,
      plan,
      customerId,
      subscriptionId,
      status,
      currentPeriodEnd,
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, cancelled = false) {
  const sessionId = getSessionIdFromMetadata(subscription);
  if (!sessionId) {
    console.error("Stripe webhook: missing sessionId on subscription event");
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = cancelled ? "free" : planFromPrice(priceId);
  const status = subscription.status ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? subscription.current_period_end * 1000
    : null;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;

  await updateUserPlan({
    sessionId,
    plan: plan ?? undefined,
    customerId,
    subscriptionId: subscription.id,
    status,
    currentPeriodEnd,
  });
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("Stripe webhook: missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Stripe webhook: signature verification failed", err?.message || err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, false);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, true);
        break;
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, false);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
