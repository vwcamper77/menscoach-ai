import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirestore } from "@/lib/firebaseAdmin";
import { resolveSessionId, sanitizeSessionId } from "@/lib/sessionId";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getFirestore();

  const r = resolveSessionId(req, { allowHeader: true, generateIfMissing: false });
  const raw = r?.sessionId ?? null;
  if (!raw) return NextResponse.json({ error: "no session id" }, { status: 400 });

  const docId = sanitizeSessionId(raw);
  const snap = await db.collection("mc_users").doc(docId).get();

  return NextResponse.json({
    rawSessionId: raw,
    docId,
    exists: snap.exists,
    data: snap.exists ? snap.data() : null,
  });
}
