import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateUser } from "@/lib/users";

type PaidPlan = "starter" | "pro" | "elite";

// IMPORTANT: must match /api/me cookie name
const SESSION_COOKIE_NAME = "mc_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;

  const cookies = raw.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(`${name}=`));
  if (!target) return null;

  const value = target.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveSessionId(req: Request): { sessionId: string; shouldSetCookie: boolean } {
  const cookieId = readCookie(req, SESSION_COOKIE_NAME);
  if (cookieId) return { sessionId: cookieId, shouldSetCookie: false };

  // Optional fallback during transition
  const headerId = req.headers.get("x-session-id");
  if (headerId) return { sessionId: headerId, shouldSetCookie: true };

  const generated = crypto.randomUUID();
  return { sessionId: generated, shouldSetCookie: true };
}

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

    const { sessionId, shouldSetCookie } = resolveSessionId(req);

    // Ensure user exists under this exact id (matches /api/me identity)
    await getOrCreateUser(sessionId);

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/chat?upgraded=${plan}`,
      cancel_url: `${siteUrl}/pricing`,

      // CRITICAL: webhook will upgrade by this sessionId
      metadata: { sessionId, plan },

      // optional debug helper
      client_reference_id: sessionId,
    });

    const res = NextResponse.json({ url: checkout.url }, { status: 200 });

    if (shouldSetCookie) {
      res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      });
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
