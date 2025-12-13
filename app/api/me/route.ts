// app/api/me/route.ts
import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { getEntitlements, Plan } from "@/lib/entitlements";
import { getDailyUsage } from "@/lib/usage";
import { getOrCreateUser } from "@/lib/users";

const COOKIE_NAME = "mc_session_id";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function readCookieSessionId(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  // Prefer cookie-based session
  const sessionId = readCookieSessionId(req) ?? "unknown-session";

  // Ensure user exists
  await getOrCreateUser(sessionId);

  const db = getFirestore();
  const snap = await db.collection("mc_users").doc(sessionId).get();
  const user = snap.exists ? (snap.data() as any) : {};

  const plan = (user?.plan ?? "free") as Plan;
  const entitlements = getEntitlements(plan);

  const dateKey = utcDateKey();
  const count = await getDailyUsage(sessionId, dateKey);

  return NextResponse.json(
    {
      sessionId,
      plan,
      entitlements,
      usage: {
        dateKey,
        messageCount: count,
        dailyLimit: entitlements.dailyMessageLimit,
      },
      profile: {
        name: user?.name ?? "",
        primaryFocus: user?.primaryFocus ?? "",
        preferredMode: user?.preferredMode ?? "default",
        goal30: user?.goal30 ?? "",
        onboardingComplete: Boolean(user?.onboardingComplete),
      },
    },
    { status: 200 }
  );
}
