import { getFirestore } from "./firebaseAdmin";
import { Mode } from "./modes";
import { EntitlementError, assertEntitlement, getEntitlements, Plan } from "./entitlements";
import { getUserPlan } from "./users";

const SUBJECTS_COLLECTION = "mc_subjects";

function safeId(id: string) {
  return id.replaceAll("/", "_");
}

export type SubjectRecord = {
  id: string;
  title: string;
  mode: Mode;
  userId: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
};

export type SubjectInput = {
  title: string;
  mode: Mode;
};

export type SubjectMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

async function countSubjects(sessionId: string) {
  const db = getFirestore();
  const snap = await db
    .collection(SUBJECTS_COLLECTION)
    .where("userId", "==", sessionId)
    .get();
  return snap.size;
}

export async function createSubject(
  sessionId: string,
  input: SubjectInput,
  plan?: Plan
): Promise<SubjectRecord> {
  const db = getFirestore();
  const userPlan = plan ?? (await getUserPlan(sessionId));
  const ent = getEntitlements(userPlan);

  assertEntitlement((ent.maxSubjects ?? 0) > 0, "UPGRADE_REQUIRED", "Subjects are available on paid plans.");

  const currentCount = await countSubjects(sessionId);
  if (ent.maxSubjects !== null && currentCount >= ent.maxSubjects) {
    throw new EntitlementError("LIMIT_REACHED", "Subject limit reached for this plan.");
  }

  const doc = db.collection(SUBJECTS_COLLECTION).doc();
  const now = Date.now();

  const record: Omit<SubjectRecord, "id"> = {
    title: input.title,
    mode: input.mode,
    userId: sessionId,
    createdAt: now,
    updatedAt: now,
  };

  await doc.set(record);
  return { id: doc.id, ...record };
}

export async function listSubjects(sessionId: string): Promise<SubjectRecord[]> {
  const db = getFirestore();
  const snap = await db
    .collection(SUBJECTS_COLLECTION)
    .where("userId", "==", sessionId)
    .orderBy("updatedAt", "desc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SubjectRecord[];
}

export async function getSubject(sessionId: string, subjectId: string): Promise<SubjectRecord> {
  const db = getFirestore();
  const ref = db.collection(SUBJECTS_COLLECTION).doc(safeId(subjectId));
  const snap = await ref.get();

  if (!snap.exists) {
    const err = new Error("Subject not found.");
    (err as any).code = "NOT_FOUND";
    throw err;
  }

  const { id: omittedId, ...data } = snap.data() as SubjectRecord;
  void omittedId;

  if (data.userId !== sessionId) {
    const err = new Error("Subject not found.");
    (err as any).code = "NOT_FOUND";
    throw err;
  }

  return { id: snap.id, ...data };
}

export async function addMessage(
  subjectId: string,
  message: Omit<SubjectMessage, "createdAt"> & { createdAt?: number }
): Promise<void> {
  const db = getFirestore();
  const now = message.createdAt ?? Date.now();

  const record: SubjectMessage = {
    role: message.role,
    content: message.content,
    createdAt: now,
  };

  const ref = db
    .collection(SUBJECTS_COLLECTION)
    .doc(safeId(subjectId))
    .collection("messages")
    .doc();

  await ref.set(record);

  await db
    .collection(SUBJECTS_COLLECTION)
    .doc(safeId(subjectId))
    .set(
      {
        updatedAt: now,
        lastMessagePreview: record.content.slice(0, 180),
      },
      { merge: true }
    );
}

export async function listMessages(
  sessionId: string,
  subjectId: string,
  limit = 50
): Promise<SubjectMessage[]> {
  await getSubject(sessionId, subjectId); // ownership check

  const db = getFirestore();
  const snap = await db
    .collection(SUBJECTS_COLLECTION)
    .doc(safeId(subjectId))
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const items = snap.docs.map((d) => d.data() as SubjectMessage);
  return items.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateSubject(
  sessionId: string,
  subjectId: string,
  updates: Partial<Pick<SubjectRecord, "title" | "mode">>
): Promise<SubjectRecord> {
  const db = getFirestore();
  const subject = await getSubject(sessionId, subjectId);

  const now = Date.now();
  const payload: Record<string, any> = { updatedAt: now };

  if (typeof updates.title === "string" && updates.title.trim()) {
    payload.title = updates.title.trim();
  }

  if (typeof updates.mode === "string" && updates.mode.trim()) {
    payload.mode = updates.mode.trim();
  }

  await db.collection(SUBJECTS_COLLECTION).doc(safeId(subjectId)).set(payload, { merge: true });

  return {
    ...subject,
    ...payload,
  };
}

export async function deleteSubject(sessionId: string, subjectId: string): Promise<void> {
  const db = getFirestore();
  await getSubject(sessionId, subjectId); // ownership check
  const docRef = db.collection(SUBJECTS_COLLECTION).doc(safeId(subjectId));

  // Delete messages (best-effort, small scale)
  const messagesSnap = await docRef.collection("messages").get();
  const batch = db.batch();
  messagesSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit().catch(() => null);

  await docRef.delete();
}
