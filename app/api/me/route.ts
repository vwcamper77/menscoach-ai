// app/api/me/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { getEntitlements } from "@/lib/entitlements";
import { getDailyUsage } from "@/lib/usage";
import { getOrCreateUser } from "@/lib/users";

// MUST match your session + checkout cookies.
const COOKIE_NAME = "mc_session_id";

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

export async function GET(req: NextRequest) {
  const db = getFirestore();

  // 1) Identify user by cookie session id
  const cookieSessionId = readCookieSessionId(req);

  // Fallback if cookie is missing (should be rare if you call /api/session on load)
  const effectiveSessionId = cookieSessionId ?? safeSessionId(crypto.randomUUID());

  // 2) Ensure user doc exists
  await getOrCreateUser(effectiveSessionId);

  // 3) Read user doc (doc id must match cookie identity)
  const snap = await db.collection("mc_users").doc(effectiveSessionId).get();
  const user = snap.exists ? (snap.data() as any) : {};

  const plan = coercePlan(user?.plan);
  const entitlements = getEntitlements(plan);

  // 4) Usage (daily)
  const usage = await getDailyUsage(effectiveSessionId, utcDateKey());

  return NextResponse.json({
    sessionId: effectiveSessionId,
    plan,
    entitlements,
    usage,
    stripe: {
      customerId: user?.stripeCustomerId ?? null,
      subscriptionId: user?.stripeSubscriptionId ?? null,
      status: user?.stripeSubscriptionStatus ?? null,
      currentPeriodEnd: user?.stripeCurrentPeriodEnd ?? null,
    },
  });
}
