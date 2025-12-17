// lib/firebaseAdmin.ts
import admin from "firebase-admin";

function getPrivateKey(): string | undefined {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return undefined;
  return key.replace(/\\n/g, "\n");
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  // IMPORTANT DEBUG (temporary)
  try {
    console.log("firebaseAdmin:init", {
      projectIdEnv: projectId,
      appProjectId: (admin.app().options as any)?.projectId ?? null,
      googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? null,
      clientEmail: clientEmail,
    });
  } catch {
    console.log("firebaseAdmin:init_log_failed");
  }

  return admin.app();
}

export function getFirestore() {
  getAdminApp();
  return admin.firestore();
}
