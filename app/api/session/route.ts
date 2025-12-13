import { NextResponse } from "next/server";

const COOKIE_NAME = "mc_session_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function generateSessionId() {
  return crypto.randomUUID();
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;

  const cookies = raw.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(`${name}=`));
  if (!target) return null;

  const value = target.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildResponse(sessionId: string) {
  const res = NextResponse.json({ sessionId });
  res.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function GET(req: Request) {
  const existing = readCookie(req, COOKIE_NAME);
  const sessionId = existing || generateSessionId();
  return buildResponse(sessionId);
}

// Optional: keep POST for backwards compatibility, but do NOT accept a client-provided id.
export async function POST() {
  const sessionId = generateSessionId();
  return buildResponse(sessionId);
}
