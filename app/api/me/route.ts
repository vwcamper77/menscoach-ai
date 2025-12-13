// app/api/me/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { getEntitlements, Plan } from "@/lib/entitlements";
import { getDailyUsage } from "@/lib/usage";
import { getOrCreateUser } from "@/lib/users";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth";

const COOKIE_NAME = "mc_session_id";

function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function readCookieSessionId(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

async function findMcUserDocIdByEmail(db: FirebaseFirestore.Firestore, email: string) {
  const qs = await db.collection("mc_users").where("email", "==", email).limit(1).get();
  if (qs.empty) return null;
  return qs.docs[0].id;
}

export async function GET(req: NextRequest) {
  const db = getFirestore();

  // Prefer NextAuth session
  const session = await getServerSession(authOptions).catch(() => null);
  const emailFromAuth = session?.user?.email ?? null;

  // With our auth.ts session callback, this should exist when authed
  const authUserId = (session as any)?.user?.id ?? null;

  // Resolve authenticated mc_users doc id
  let mcUserDocId: string | null = null;

  if (authUserId) {
    mcUserDocId = authUserId;
  } else if (emailFromAuth) {
    mcUserDocId = await findMcUserDocIdByEmail(db, emailFromAuth);
  }

  // Cookie session id (anonymous)
  const cookieSessionId = readCookieSessionId(req);

  // Choose sessionId in this order:
  // 1) authenticated user doc
  // 2) cookie doc
  // 3) fallback
  const sessionId = mcUserDocId ?? cookieSessionId ?? "unknown-session";

  // IMPORTANT FIX:
  // Only create anonymous user records when we truly have a cookie session.
  // Never create "unknown-session", and never create based on auth-linked identity.
  if (!mcUserDocId && cookieSessionId) {
    await getOrCreateUser(cookieSessionId);
  }

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

      email: emailFromAuth ?? user?.email ?? null,
      provider: user?.provider ?? null,

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
        onboardingSkipped: Boolean(user?.onboardingSkipped),
      },
    },
    { status: 200 }
  );
}
