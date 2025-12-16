import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "mc_session_id";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export type SessionIdResolution = {
  sessionId: string;
  cookieSessionId: string | null;
  shouldSetCookie: boolean;
};

export function sanitizeSessionId(sessionId: string) {
  return sessionId.replaceAll("/", "_");
}

function decodeCookie(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readSessionCookie(req: Request | NextRequest) {
  if ("cookies" in req && typeof req.cookies?.get === "function") {
    return req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
  }

  const raw = req.headers.get("cookie");
  if (!raw) return null;

  const cookies = raw.split(";").map((c) => c.trim());
  const target = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!target) return null;

  const value = target.slice(SESSION_COOKIE_NAME.length + 1);
  return decodeCookie(value);
}

export function resolveSessionId(
  req: Request | NextRequest,
  options: { allowHeader?: boolean; generateIfMissing?: boolean } = {}
): SessionIdResolution | null {
  const rawCookie = readSessionCookie(req);
  const cookieSessionId = rawCookie ? sanitizeSessionId(rawCookie) : null;
  const cookieNeedsRewrite = Boolean(rawCookie && cookieSessionId !== rawCookie);

  if (cookieSessionId) {
    return { sessionId: cookieSessionId, cookieSessionId, shouldSetCookie: cookieNeedsRewrite };
  }

  if (options.allowHeader) {
    const headerValue = req.headers.get("x-session-id");
    if (headerValue) {
      return {
        sessionId: sanitizeSessionId(headerValue),
        cookieSessionId: null,
        shouldSetCookie: true,
      };
    }
  }

  if (options.generateIfMissing) {
    const generated = sanitizeSessionId(crypto.randomUUID());
    return { sessionId: generated, cookieSessionId: null, shouldSetCookie: true };
  }

  return null;
}

export function setSessionIdCookie(res: NextResponse, sessionId: string) {
  res.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });
}
