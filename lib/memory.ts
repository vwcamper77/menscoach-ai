// lib/memory.ts
import { FieldValue } from "firebase-admin/firestore";
import { decryptJson, encryptJson } from "./crypto";
import { getFirestore } from "./firebaseAdmin";
import { sanitizeSessionId } from "./sessionId";

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
const EMPTY_MEMORY: UserMemory = { history: [] };

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

function normalizeHistory(value: unknown): StoredTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is StoredTurn =>
        !!item &&
        ((item as StoredTurn).role === "user" ||
          (item as StoredTurn).role === "assistant") &&
        typeof (item as StoredTurn).content === "string"
    )
    .map((item) => ({ role: item.role, content: item.content }));
}

function coerceMemory(value: Partial<UserMemory> | null | undefined): UserMemory {
  if (!value) return { ...EMPTY_MEMORY };

  const name = typeof value.name === "string" ? value.name : undefined;
  const goals = typeof value.goals === "string" ? value.goals : undefined;
  const currentChallenge =
    typeof value.currentChallenge === "string" ? value.currentChallenge : undefined;

  return {
    history: normalizeHistory(value.history),
    ...(name !== undefined ? { name } : {}),
    ...(goals !== undefined ? { goals } : {}),
    ...(currentChallenge !== undefined ? { currentChallenge } : {}),
  };
}

function hasMemoryContent(memory: UserMemory | null): memory is UserMemory {
  if (!memory) return false;

  return (
    (memory.history?.length ?? 0) > 0 ||
    memory.name !== undefined ||
    memory.goals !== undefined ||
    memory.currentChallenge !== undefined
  );
}

function decodeMemory(
  data: FirebaseFirestore.DocumentData | undefined
): { memory: UserMemory | null; isLegacy: boolean } {
  if (!data) return { memory: null, isLegacy: false };

  const enc = (data as any).memoryEnc;
  if (typeof enc === "string") {
    try {
      const decrypted = decryptJson<UserMemory>(enc);
      return { memory: coerceMemory(decrypted), isLegacy: false };
    } catch (err) {
      console.error("Failed to decrypt session memory", err);
      return { memory: null, isLegacy: false };
    }
  }

  const legacyMemory = coerceMemory({
    name: (data as any).name,
    goals: (data as any).goals,
    currentChallenge: (data as any).currentChallenge,
    history: (data as any).history,
  });

  return { memory: hasMemoryContent(legacyMemory) ? legacyMemory : null, isLegacy: true };
}

function buildEncryptedDoc(
  memory: UserMemory,
  existing?: FirebaseFirestore.DocumentData
): Record<string, any> {
  const now = Date.now();
  return {
    memoryEnc: encryptJson(memory),
    updatedAt: now,
    createdAt: (existing as any)?.createdAt ?? now,
    name: FieldValue.delete(),
    goals: FieldValue.delete(),
    currentChallenge: FieldValue.delete(),
    history: FieldValue.delete(),
  };
}

export async function getMemory(sessionId: string): Promise<UserMemory | null> {
  const db = getFirestore();
  const docId = sanitizeSessionId(sessionId);

  const snap = await db.collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return null;

  const data = snap.data();
  const { memory } = decodeMemory(data);

  return memory;
}

export async function appendToHistory(
  sessionId: string,
  turns: StoredTurn[]
): Promise<void> {
  const db = getFirestore();
  const docId = sanitizeSessionId(sessionId);
  const ref = db.collection(COLLECTION).doc(docId);

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const existing = (snap.exists ? (snap.data() as any) : {}) ?? {};
    const { memory } = decodeMemory(existing);
    const history = memory?.history ?? [];

    const nextHistory = [...history, ...turns];
    const trimmed =
      nextHistory.length > MAX_TURNS
        ? nextHistory.slice(nextHistory.length - MAX_TURNS)
        : nextHistory;

    const updatedMemory: UserMemory = {
      ...(memory ?? EMPTY_MEMORY),
      history: trimmed,
    };

    const updateDoc = buildEncryptedDoc(updatedMemory, existing);
    tx.set(ref, updateDoc, { merge: true });
  });
}

export async function saveMemory(
  sessionId: string,
  data: Partial<Omit<UserMemory, "history">>
): Promise<void> {
  const db = getFirestore();
  const docId = sanitizeSessionId(sessionId);
  const ref = db.collection(COLLECTION).doc(docId);

  const cleaned = stripUndefined(data as Record<string, any>);

  // If nothing real to save, don't write
  if (Object.keys(cleaned).length === 0) return;

  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() as any) : {};
  const { memory } = decodeMemory(existing);

  const nextMemory: UserMemory = {
    ...(memory ?? EMPTY_MEMORY),
    ...(cleaned as Partial<UserMemory>),
  };

  await ref.set(buildEncryptedDoc(nextMemory, existing), { merge: true });
}
