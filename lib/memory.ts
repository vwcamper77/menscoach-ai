// lib/memory.ts
// Lightweight in-memory "memory" for menscoach.ai.
// No Postgres, no KV. Just a simple Map in server memory.
// This will reset on cold start or new lambda, but is fine for MVP.

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

const memoryStore = new Map<string, UserMemory>();

export async function getMemory(
  sessionId: string
): Promise<UserMemory | null> {
  const mem = memoryStore.get(sessionId);
  return mem ?? null;
}

export async function appendToHistory(
  sessionId: string,
  turns: StoredTurn[]
): Promise<void> {
  const existing = memoryStore.get(sessionId) ?? { history: [] };

  const newHistory = [...existing.history, ...turns];

  // Keep only last N turns to avoid unbounded growth
  const MAX_TURNS = 20;
  const trimmed =
    newHistory.length > MAX_TURNS
      ? newHistory.slice(newHistory.length - MAX_TURNS)
      : newHistory;

  memoryStore.set(sessionId, {
    ...existing,
    history: trimmed,
  });
}

export async function saveMemory(
  sessionId: string,
  data: Partial<Omit<UserMemory, "history">>
): Promise<void> {
  const existing = memoryStore.get(sessionId) ?? { history: [] };

  memoryStore.set(sessionId, {
    ...existing,
    ...data,
  });
}
