import { getFirestore } from "./firebaseAdmin";
import { EntitlementError } from "./entitlements";
import { sanitizeSessionId } from "./sessionId";

const USAGE_COLLECTION = "mc_usage";

export type UsageRecord = {
  sessionId: string;
  dateKey: string;
  count: number;
  createdAt: number;
  updatedAt: number;
};

function usageDocId(sessionId: string, dateKey: string) {
  return `${sanitizeSessionId(sessionId)}_${dateKey}`;
}

export async function getDailyUsage(
  sessionId: string,
  dateKey: string
): Promise<number> {
  const db = getFirestore();
  const ref = db.collection(USAGE_COLLECTION).doc(usageDocId(sessionId, dateKey));
  const snap = await ref.get();

  if (!snap.exists) return 0;

  const data = snap.data() as Partial<UsageRecord>;
  return data.count ?? 0;
}

export async function incrementDailyUsage(
  sessionId: string,
  dateKey: string,
  limit?: number | null
): Promise<number> {
  const db = getFirestore();
  const ref = db.collection(USAGE_COLLECTION).doc(usageDocId(sessionId, dateKey));

  let nextCount = 0;

  await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const existing = snap.exists
      ? ((snap.data() as Partial<UsageRecord>) ?? {})
      : {};

    const current = existing.count ?? 0;
    nextCount = current + 1;

    if (limit !== null && limit !== undefined && nextCount > limit) {
      throw new EntitlementError(
        "LIMIT_REACHED",
        "Daily message limit reached."
      );
    }

    const now = Date.now();

    const doc: UsageRecord = {
      sessionId,
      dateKey,
      count: nextCount,
      createdAt: snap.exists ? existing.createdAt ?? now : now,
      updatedAt: now,
    };

    tx.set(ref, doc, { merge: true });
  });

  return nextCount;
}
