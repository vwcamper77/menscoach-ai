import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { getFirestore } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getFirestore();
  const envProjectId = process.env.FIREBASE_PROJECT_ID ?? null;

  // Some admin SDK builds don’t expose projectId on app.options,
  // so we surface multiple signals:
  const appProjectId = (admin.app().options as any)?.projectId ?? null;
  const credProjectId =
    (admin.app().options as any)?.credential?.projectId ??
    (admin.app().options as any)?.credential?._projectId ??
    null;

  // Write a marker doc so we can confirm which Firestore you’re hitting
  const markerId = `debug-${Date.now()}`;
  await db.collection("_debug").doc(markerId).set({
    createdAt: new Date().toISOString(),
    envProjectId,
    appProjectId,
    credProjectId,
  });

  return NextResponse.json({
    envProjectId,
    appProjectId,
    credProjectId,
    googleCloudProject: process.env.GOOGLE_CLOUD_PROJECT ?? null,
    markerWritten: { collection: "_debug", docId: markerId },
    hasServiceAccountEnv: {
      FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    },
  });
}
