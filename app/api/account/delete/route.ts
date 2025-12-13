import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getFirestore } from "@/lib/firebaseAdmin";

const COOKIE_NAME = "mc_session_id";

async function deleteWhere(db: FirebaseFirestore.Firestore, collection: string, field: string, value: string) {
  const qs = await db.collection(collection).where(field, "==", value).get();
  if (qs.empty) return;

  const batch = db.batch();
  qs.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;

  if (!email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const db = getFirestore();

  // Find NextAuth user by email
  const userSnap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (!userSnap.empty) {
    const userId = userSnap.docs[0].id;

    // Delete your app profile
    await db.collection("mc_users").doc(userId).delete().catch(() => null);

    // Delete your app data keyed by userId (add more collections as needed)
    await deleteWhere(db, "mc_sessions", "userId", userId).catch(() => null);
    await deleteWhere(db, "mc_usage", "userId", userId).catch(() => null);

    // Delete NextAuth data
    await deleteWhere(db, "accounts", "userId", userId).catch(() => null);
    await deleteWhere(db, "sessions", "userId", userId).catch(() => null);
    await db.collection("users").doc(userId).delete().catch(() => null);
  }

  // Also clear anonymous cookie session so /api/me doesn't recreate anything tied to the old browser session
  const res = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
