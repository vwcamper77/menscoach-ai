import { NextResponse } from "next/server";
import { decryptJson, encryptJson } from "@/lib/crypto";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const sample = { text: "test", at: new Date().toISOString() };
  const enc = encryptJson(sample);
  const dec = decryptJson<typeof sample>(enc);

  return NextResponse.json({
    encryptedStartsWithV1: enc.startsWith("v1:"),
    encryptedPreview: enc.slice(0, 30) + "...",
    decrypted: dec,
  });
}
