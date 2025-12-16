// app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { resolveSessionId } from "@/lib/sessionId";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export async function POST(req: Request) {
  const resolution = resolveSessionId(req, { allowHeader: true });
  if (!resolution) {
    return NextResponse.json(
      { error: { code: "SESSION_REQUIRED", message: "Session is required." } },
      { status: 401 }
    );
  }

  const sessionId = resolution.sessionId;
  const session = await getServerSession(authOptions);
  const authEmail = session?.user?.email ? String(session.user.email).toLowerCase().trim() : null;
  const authUserId = (session?.user as any)?.id ?? null;
  const provider = (session?.user as any)?.provider ?? null;

  const body = await req.json().catch(() => ({}));

  const payload: Record<string, any> = {
    name: typeof body?.name === "string" ? body.name : "",
    primaryFocus: typeof body?.primaryFocus === "string" ? body.primaryFocus : "",
    preferredMode: typeof body?.preferredMode === "string" ? body.preferredMode : "direct",
    goal30: typeof body?.goal30 === "string" ? body.goal30 : "",
    onboardingComplete: true,
    onboardingSkipped: Boolean(body?.onboardingSkipped),
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  if (authEmail) payload.authEmail = authEmail;
  if (authUserId) payload.authUserId = authUserId;
  payload.provider = provider;

  const db = getFirestore();
  await db.collection("mc_users").doc(sessionId).set(payload, { merge: true });

  return NextResponse.json({ ok: true }, { status: 200 });
}
