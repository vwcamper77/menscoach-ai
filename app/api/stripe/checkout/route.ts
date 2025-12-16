import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/users";
import { resolveSessionId, setSessionIdCookie } from "@/lib/sessionId";

type PaidPlan = "starter" | "pro" | "elite";
function getPriceId(plan: PaidPlan) {
  const map: Record<PaidPlan, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
  };

  const priceId = map[plan];
  if (!priceId) throw new Error(`Missing Stripe price env for plan: ${plan}`);
  return priceId;
}

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan?: PaidPlan };
    if (!plan || !["starter", "pro", "elite"].includes(plan)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid plan" } },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      return NextResponse.json(
        { error: { code: "SERVER_MISCONFIG", message: "Missing NEXT_PUBLIC_SITE_URL" } },
        { status: 500 }
      );
    }

    const resolution = resolveSessionId(req, { allowHeader: true, generateIfMissing: true });
    if (!resolution) {
      throw new Error("Unable to resolve session id for checkout");
    }
    const { sessionId, shouldSetCookie } = resolution;

    // Ensure user doc exists before checkout
    await getOrCreateUser(sessionId);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/chat?upgraded=${plan}`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { sessionId, plan },
      subscription_data: {
        metadata: { sessionId, plan },
      },
      client_reference_id: sessionId,
    });

    const res = NextResponse.json({ url: checkout.url }, { status: 200 });

    if (shouldSetCookie) {
      setSessionIdCookie(res, sessionId);
    }

    return res;
  } catch (err: any) {
    console.error("Stripe checkout error:", err?.message || err);
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "Failed to start checkout" } },
      { status: 500 }
    );
  }
}
