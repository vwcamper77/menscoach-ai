// lib/memory.ts
import { getFirestore } from "./firebaseAdmin";

type StoredTurn = {
  role: "user" | "assistant";
  content: string;
};

export type UserMemory = {
  name?: string;
  goals?: string;
  currentChallenge?: string;
  history: StoredTurn[];
};

const COLLECTION = "mc_sessions";
const MAX_TURNS = 20;

function safeSessionId(sessionId: string) {
  return sessionId.replaceAll("/", "_");
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export async function getMemory(sessionId: string): Promise<UserMemory | null> {
  const db = getFirestore();
  const docId = safeSessionId(sessionId);

  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;

  const data = snap.data() as Partial<UserMemory> | undefined;
  if (!data) return null;

  return {
    name: data.name,
    goals: data.goals,
    currentChallenge: data.currentChallenge,
    history: Array.isArray(data.history) ? (data.history as StoredTurn[]) : [],
  };
}

export async function appendToHistory(
  sessionId: string,
  turns: StoredTurn[]
): Promise<void> {
  const db = getFirestore();
  const docId = safeSessionId(sessionId);
  const ref = db.collection(COLLECTION).doc(docId);

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const existing = (snap.exists ? (snap.data() as any) : {}) ?? {};

    const history = Array.isArray(existing.history)
      ? (existing.history as StoredTurn[])
      : [];

    const nextHistory = [...history, ...turns];
    const trimmed =
      nextHistory.length > MAX_TURNS
        ? nextHistory.slice(nextHistory.length - MAX_TURNS)
        : nextHistory;

    // Build update doc without undefined
    const updateDoc = stripUndefined({
      ...existing,
      history: trimmed,
      updatedAt: Date.now(),
      createdAt: snap.exists ? existing.createdAt ?? Date.now() : Date.now(),
    });

    tx.set(ref, updateDoc, { merge: true });
  });
}

export async function saveMemory(
  sessionId: string,
  data: Partial<Omit<UserMemory, "history">>
): Promise<void> {
  const db = getFirestore();
  const docId = safeSessionId(sessionId);
  const ref = db.collection(COLLECTION).doc(docId);

  const cleaned = stripUndefined(data as Record<string, any>);

  // ✅ If nothing real to save, don’t write
  if (Object.keys(cleaned).length === 0) return;

  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() as any) : {};

  await ref.set(
    stripUndefined({
      ...cleaned,
      updatedAt: Date.now(),
      createdAt: snap.exists ? existing.createdAt ?? Date.now() : Date.now(),
    }),
    { merge: true }
  );
}
