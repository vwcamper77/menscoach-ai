import { getFirestore } from "@/lib/firebaseAdmin";
import { Plan } from "@/lib/entitlements";

const USERS_COLLECTION = "users";
const DEFAULT_PLAN: Plan = "free";

export type UserRecord = {
  email: string;
  name?: string | null;
  provider?: string | null;

  plan: Plan;

  createdAt: number;
  updatedAt: number;
  lastSeenAt?: number;

  // onboarding / comms flags
  welcomeEmailSentAt?: number | null;
  adminNotifiedAt?: number | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Get existing user by email, or create a new one.
 * Returns the user record AND whether it was newly created.
 */
export async function getOrCreateUserByEmail(params: {
  email: string;
  name?: string | null;
  provider?: string | null;
}): Promise<{ user: UserRecord; isNew: boolean }> {
  const db = getFirestore();
  const email = normalizeEmail(params.email);
  const ref = db.collection(USERS_COLLECTION).doc(email);
  const snap = await ref.get();

  const now = Date.now();

  if (snap.exists) {
    const data = snap.data() as Partial<UserRecord>;

    const user: UserRecord = {
      email,
      name: data.name ?? params.name ?? null,
      provider: data.provider ?? params.provider ?? null,
      plan: (data.plan as Plan) ?? DEFAULT_PLAN,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
      lastSeenAt: now,
      welcomeEmailSentAt: data.welcomeEmailSentAt ?? null,
      adminNotifiedAt: data.adminNotifiedAt ?? null,
    };

    await ref.set(
      {
        lastSeenAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    return { user, isNew: false };
  }

  const newUser: UserRecord = {
    email,
    name: params.name ?? null,
    provider: params.provider ?? null,
    plan: DEFAULT_PLAN,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    welcomeEmailSentAt: null,
    adminNotifiedAt: null,
  };

  await ref.set(newUser);

  return { user: newUser, isNew: true };
}

/**
 * Mark that the welcome email has been sent
 */
export async function markWelcomeEmailSent(email: string) {
  const db = getFirestore();
  const ref = db.collection(USERS_COLLECTION).doc(normalizeEmail(email));
  await ref.set(
    {
      welcomeEmailSentAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Mark that admin signup notification was sent
 */
export async function markAdminNotified(email: string) {
  const db = getFirestore();
  const ref = db.collection(USERS_COLLECTION).doc(normalizeEmail(email));
  await ref.set(
    {
      adminNotifiedAt: Date.now(),
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Get user plan (safe default)
 */
export async function getUserPlanByEmail(email: string): Promise<Plan> {
  const db = getFirestore();
  const ref = db.collection(USERS_COLLECTION).doc(normalizeEmail(email));
  const snap = await ref.get();

  if (!snap.exists) return DEFAULT_PLAN;

  const data = snap.data() as Partial<UserRecord>;
  return (data.plan as Plan) ?? DEFAULT_PLAN;
}
