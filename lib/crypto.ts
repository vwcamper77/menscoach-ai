import crypto from "crypto";

const KEY_B64 = process.env.MC_DATA_KEY_B64;

function getKey(): Buffer {
  if (!KEY_B64) throw new Error("Missing MC_DATA_KEY_B64");
  const key = Buffer.from(KEY_B64, "base64");
  if (key.length !== 32) {
    throw new Error("MC_DATA_KEY_B64 must decode to 32 bytes");
  }
  return key;
}

export function encryptJson(value: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // AES-GCM recommended IV size
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptJson<T>(payload: string): T {
  if (!payload.startsWith("v1:")) {
    throw new Error("Unsupported encrypted payload");
  }

  const key = getKey();
  const [ivB64, tagB64, ctB64] = payload.slice(3).split(".");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString("utf8")) as T;
}
