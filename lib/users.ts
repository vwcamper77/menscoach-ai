import { getFirestore } from "./firebaseAdmin";
import { Plan } from "./entitlements";
import { sanitizeSessionId } from "./sessionId";

const USERS_COLLECTION = "mc_users";
const DEFAULT_PLAN: Plan = "free";

export type UserRecord = {
  plan: Plan;
  createdAt: number;
  updatedAt: number;
};

export async function getOrCreateUser(sessionId: string): Promise<UserRecord> {
  const db = getFirestore();
  const docId = sanitizeSessionId(sessionId);
  const ref = db.collection(USERS_COLLECTION).doc(docId);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data() as Partial<UserRecord>;
    return {
      plan: (data.plan as Plan) ?? DEFAULT_PLAN,
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: data.updatedAt ?? Date.now(),
    };
  }

  const now = Date.now();
  const newUser: UserRecord = {
    plan: DEFAULT_PLAN,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(newUser);
  return newUser;
}

export async function getUserPlan(sessionId: string): Promise<Plan> {
  const user = await getOrCreateUser(sessionId);
  return user.plan ?? DEFAULT_PLAN;
}
