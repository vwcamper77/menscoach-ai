// app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth";
import { getFirestore } from "@/lib/firebaseAdmin";

const SESSION_COOKIE_NAME = "mc_session_id";

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

function resolveSessionId(req: Request): string | null {
  return readCookie(req, SESSION_COOKIE_NAME) ?? req.headers.get("x-session-id");
}

export async function POST(req: Request) {
  // Prefer authenticated user id so onboarding marks the same doc /api/me reads.
  const session = await getServerSession(authOptions as any).catch(() => null);
  const authUserId =
    (session as any)?.user?.id ??
    (session as any)?.userId ??
    null;

  const sessionId = authUserId ?? resolveSessionId(req);

  if (!sessionId) {
    return NextResponse.json(
      { error: { code: "SESSION_REQUIRED", message: "Session is required." } },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const db = getFirestore();

  await db.collection("mc_users").doc(sessionId).set(
    {
      name: typeof body?.name === "string" ? body.name : "",
      primaryFocus: typeof body?.primaryFocus === "string" ? body.primaryFocus : "",
      preferredMode: typeof body?.preferredMode === "string" ? body.preferredMode : "direct",
      goal30: typeof body?.goal30 === "string" ? body.goal30 : "",
      onboardingComplete: true,
      onboardingSkipped: Boolean(body?.onboardingSkipped),
      updatedAt: new Date(),
      createdAt: new Date(),
    },
    { merge: true }
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}
