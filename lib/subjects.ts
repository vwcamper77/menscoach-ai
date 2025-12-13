import { getFirestore } from "./firebaseAdmin";
import { Mode } from "./modes";
import {
  EntitlementError,
  assertEntitlement,
  getEntitlements,
  Plan,
} from "./entitlements";
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

  assertEntitlement(
    (ent.maxSubjects ?? 0) > 0,
    "UPGRADE_REQUIRED",
    "Subjects are available on Pro."
  );

  const currentCount = await countSubjects(sessionId);
  if (ent.maxSubjects !== null && currentCount >= ent.maxSubjects) {
    throw new EntitlementError(
      "LIMIT_REACHED",
      "Subject limit reached for this plan."
    );
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
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SubjectRecord[];
}

export async function getSubject(
  sessionId: string,
  subjectId: string
): Promise<SubjectRecord> {
  const db = getFirestore();
  const ref = db.collection(SUBJECTS_COLLECTION).doc(safeId(subjectId));
  const snap = await ref.get();

  if (!snap.exists) {
    const err = new Error("Subject not found.");
    (err as any).code = "NOT_FOUND";
    throw err;
  }

  const { id: _ignored, ...data } = snap.data() as SubjectRecord;
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
