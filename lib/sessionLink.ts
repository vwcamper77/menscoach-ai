import { getFirestore } from "./firebaseAdmin";

const LINK_COLLECTION = "mc_user_links";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function encodeEmailDocId(email: string) {
  const normalized = normalizeEmail(email);
  const base64 = Buffer.from(normalized).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sanitizeSessionId(sessionId: string) {
  return sessionId.replaceAll("/", "_");
}

export async function getLinkedSessionId(email: string): Promise<string | null> {
  const db = getFirestore();
  const docId = encodeEmailDocId(email);
  const snap = await db.collection(LINK_COLLECTION).doc(docId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : null;
  return sessionId ? sanitizeSessionId(sessionId) : null;
}

export async function linkEmailToSession(
  email: string,
  sessionId: string,
  authUserId?: string | null
) {
  const db = getFirestore();
  const docId = encodeEmailDocId(email);
  const ref = db.collection(LINK_COLLECTION).doc(docId);
  const snap = await ref.get();

  const payload: Record<string, any> = {
    email: normalizeEmail(email),
    sessionId: sanitizeSessionId(sessionId),
    updatedAt: new Date(),
  };

  if (authUserId) {
    payload.authUserId = authUserId;
  }

  if (!snap.exists) {
    payload.createdAt = new Date();
  }

  await ref.set(payload, { merge: true });
}

export async function unlinkEmailSession(email: string) {
  const db = getFirestore();
  const docId = encodeEmailDocId(email);
  await db.collection(LINK_COLLECTION).doc(docId).delete();
}
