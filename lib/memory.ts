// lib/memory.ts
import { sql } from "@/lib/db";

type Turn = { role: "user" | "assistant"; content: string };

export type CoachMemory = {
  name?: string;
  goals?: string;
  currentChallenge?: string;
  history: Turn[];
  updatedAt: number;
};

const HISTORY_LIMIT = 12;

// -----------------------------
// DEV MODE — Local JSON store
// -----------------------------
const isDev = process.env.NODE_ENV === "development";

const devStore: Record<string, CoachMemory> = {};

async function devGetMemory(id: string): Promise<CoachMemory | null> {
  return devStore[id] ?? null;
}

async function devSaveMemory(id: string, partial: Partial<CoachMemory>) {
  const existing = devStore[id] ?? {
    history: [],
    updatedAt: Date.now(),
  };

  devStore[id] = {
    ...existing,
    ...partial,
    history: partial.history
      ? partial.history.slice(-HISTORY_LIMIT)
      : existing.history.slice(-HISTORY_LIMIT),
    updatedAt: Date.now(),
  };
}

async function devAppendToHistory(id: string, turns: Turn[]) {
  const existing = devStore[id] ?? {
    history: [],
    updatedAt: Date.now(),
  };

  devStore[id] = {
    ...existing,
    history: [...existing.history, ...turns].slice(-HISTORY_LIMIT),
    updatedAt: Date.now(),
  };
}

// -----------------------------
// PRODUCTION — Postgres
// -----------------------------

async function prodGetMemory(id: string): Promise<CoachMemory | null> {
  const result =
    await sql`SELECT * FROM coach_memory WHERE id = ${id} LIMIT 1;`;

  if (result.rowCount === 0) return null;

  const row = result.rows[0];

  return {
    name: row.name ?? undefined,
    goals: row.goals ?? undefined,
    currentChallenge: row.current_challenge ?? undefined,
    history: row.history ?? [],
    updatedAt: row.updated_at ? Number(row.updated_at) : Date.now(),
  };
}

async function prodSaveMemory(id: string, partial: Partial<CoachMemory>) {
  const existing = await prodGetMemory(id);

  const merged: CoachMemory = {
    name: partial.name ?? existing?.name,
    goals: partial.goals ?? existing?.goals,
    currentChallenge:
      partial.currentChallenge ?? existing?.currentChallenge,
    history: partial.history
      ? partial.history.slice(-HISTORY_LIMIT)
      : existing?.history?.slice(-HISTORY_LIMIT) ?? [],
    updatedAt: Date.now(),
  };

  await sql`
    INSERT INTO coach_memory (id, name, goals, current_challenge, history, updated_at)
    VALUES (
      ${id},
      ${merged.name},
      ${merged.goals},
      ${merged.currentChallenge},
      ${JSON.stringify(merged.history)},
      to_timestamp(${merged.updatedAt} / 1000.0)
    )
    ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      goals = EXCLUDED.goals,
      current_challenge = EXCLUDED.current_challenge,
      history = EXCLUDED.history,
      updated_at = EXCLUDED.updated_at;
  `;
}

async function prodAppendToHistory(id: string, turns: Turn[]) {
  const existing = await prodGetMemory(id);

  const combined = [
    ...(existing?.history ?? []),
    ...turns,
  ].slice(-HISTORY_LIMIT);

  await prodSaveMemory(id, { history: combined });
}

// -----------------------------
// PUBLIC FUNCTIONS — Auto-switch
// -----------------------------

export async function getMemory(id: string) {
  return isDev ? devGetMemory(id) : prodGetMemory(id);
}

export async function saveMemory(id: string, partial: Partial<CoachMemory>) {
  return isDev ? devSaveMemory(id, partial) : prodSaveMemory(id, partial);
}

export async function appendToHistory(id: string, turns: Turn[]) {
  return isDev
    ? devAppendToHistory(id, turns)
    : prodAppendToHistory(id, turns);
}
