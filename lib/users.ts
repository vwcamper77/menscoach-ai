import { getFirestore } from "./firebaseAdmin";
import { Plan } from "./entitlements";
import { sanitizeSessionId } from "./sessionId";

const USERS_COLLECTION = "mc_users";
const DEFAULT_PLAN: Plan = "free";

export type UserRecord = {
  plan: Plan;
  createdAt: number;
  updatedAt: number;
  lastSeenAt?: number;
};

export async function getOrCreateUser(sessionId: string): Promise<UserRecord> {
  const db = getFirestore();
  const docId = sanitizeSessionId(sessionId);
  const ref = db.collection(USERS_COLLECTION).doc(docId);
  const snap = await ref.get();
  const now = Date.now();

  if (!snap.exists) {
    const newUser: UserRecord = {
      plan: DEFAULT_PLAN,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };

    console.log("getOrCreateUser:create", {
      docId,
      existed: false,
      writing: newUser,
      plan: newUser.plan,
    });

    await ref.set(newUser);
    return newUser;
  }

  const data = (snap.data() as Partial<UserRecord>) ?? {};
  const plan = (data.plan as Plan) ?? DEFAULT_PLAN;
  const updatePayload = {
    updatedAt: now,
    lastSeenAt: now,
  };

  console.log("getOrCreateUser:exists", {
    docId,
    existed: true,
    planRead: plan,
    writing: updatePayload,
  });

  await ref.set(updatePayload, { merge: true });

  return {
    plan,
    createdAt: data.createdAt ?? now,
    updatedAt: updatePayload.updatedAt,
    lastSeenAt: updatePayload.lastSeenAt,
  };
}

export async function getUserPlan(sessionId: string): Promise<Plan> {
  const user = await getOrCreateUser(sessionId);
  return user.plan ?? DEFAULT_PLAN;
}
