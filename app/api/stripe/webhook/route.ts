// app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getFirestore } from "@/lib/firebaseAdmin";
import { sanitizeSessionId } from "@/lib/sessionId";

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

function normalizeEmail(email: string | null | undefined) {
  const e = (email ?? "").trim().toLowerCase();
  return e ? e : null;
}

function planFromPrice(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  const plan = PRICE_TO_PLAN[priceId];
  return plan ?? null;
}

function getCurrentPeriodEnd(
  subscription: Stripe.Subscription | Stripe.Response<Stripe.Subscription>
): number | null {
  const sub: Stripe.Subscription =
    (subscription as any)?.data ? (subscription as any).data : (subscription as any);

  const ends: number[] =
    sub.items?.data
      ?.map((it: any) => it?.current_period_end)
      .filter((v: any) => typeof v === "number") ?? [];

  if (ends.length) return Math.max(...ends) * 1000;

  const raw = (sub as any)?.current_period_end;
  return typeof raw === "number" ? raw * 1000 : null;
}

async function patchMcUserByDocId(
  docId: string,
  patch: Record<string, any>
) {
  const db = getFirestore();
  await db.collection("mc_users").doc(docId).set(
    {
      ...patch,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

async function linkEmailToSessionDoc(email: string, sessionIdRaw: string) {
  const db = getFirestore();
  const e = normalizeEmail(email);
  if (!e) return;

  await db.collection("mc_user_links").doc(e).set(
    {
      sessionId: sanitizeSessionId(sessionIdRaw),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

async function findSessionIdByCustomerId(customerId: string | null | undefined) {
  if (!customerId) return null;

  const db = getFirestore();
  const qs = await db
    .collection("mc_users")
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (qs.empty) return null;
  return sanitizeSessionId(qs.docs[0].id);
}

function getSessionIdFromMetadata(
  obj: { metadata?: Record<string, any> | null | undefined } & {
    client_reference_id?: string | null;
  }
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

async function resolveWebhookDocId(
  eventType: string,
  payload: { metadata?: Record<string, any> | null | undefined; client_reference_id?: string | null },
  customerId: string | null
): Promise<string | null> {
  const metadataSessionId = getSessionIdFromMetadata(payload);
  const candidate =
    metadataSessionId ?? (customerId ? await findSessionIdByCustomerId(customerId) : null);

  if (!candidate) {
    console.error("Stripe webhook: could not resolve mc_users doc for event", {
      eventType,
      customerId,
    });
    return null;
  }

  return sanitizeSessionId(candidate);
}

async function handleCheckoutSession(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const buyerEmail = normalizeEmail(
    session.customer_details?.email ?? session.customer_email ?? null
  );

  const docId = await resolveWebhookDocId("checkout.session.completed", session, customerId);
  if (!docId) {
    return;
  }

  let plan = (session.metadata?.plan as Plan) ?? null;
  let status: string | null = null;
  let currentPeriodEnd: number | null = null;

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });

    const sub: Stripe.Subscription =
      (subscription as any)?.data ? (subscription as any).data : (subscription as any);

    status = sub.status ?? null;
    currentPeriodEnd = getCurrentPeriodEnd(subscription);

    if (!plan) {
      plan = planFromPrice(sub.items.data[0]?.price?.id) ?? plan;
    }
  }

  if (!plan) {
    console.error("Stripe webhook: could not resolve plan for checkout.session.completed", {
      docId,
      subscriptionId,
      customerId,
    });
  }

  console.log("Stripe webhook", {
    eventType: "checkout.session.completed",
    docId,
    customerId,
    subscriptionId,
    plan,
  });

  const payload: Record<string, any> = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: status,
    stripeCurrentPeriodEnd: currentPeriodEnd,
    authEmail: buyerEmail,
    email: buyerEmail, // helpful for searching and admin views
  };

  if (plan) {
    payload.plan = plan;
  }

  await patchMcUserByDocId(docId, payload);

  if (buyerEmail) {
    await linkEmailToSessionDoc(buyerEmail, docId);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  eventType: string,
  cancelled = false
) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = cancelled ? "free" : planFromPrice(priceId);
  const status = subscription.status ?? null;
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null;
  const docId = await resolveWebhookDocId(eventType, subscription, customerId);
  if (!docId) {
    return;
  }

  console.log("Stripe webhook", {
    eventType,
    docId,
    customerId,
    subscriptionId: subscription.id,
    plan,
  });

  const payload: Record<string, any> = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: status,
    stripeCurrentPeriodEnd: currentPeriodEnd,
  };

  if (plan) {
    payload.plan = plan;
  }

  await patchMcUserByDocId(docId, payload);
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
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.type, false);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.type, true);
        break;
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.type, false);
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
