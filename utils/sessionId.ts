// utils/sessionId.ts
const KEY = "mc_session_id";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  // 90 days
  const maxAge = 60 * 60 * 24 * 90;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function safeGetLocalStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getOrCreateSessionId() {
  // 1) try localStorage
  const existingLS = safeGetLocalStorage(KEY);
  if (existingLS) return existingLS;

  // 2) try cookie
  const existingCookie = getCookie(KEY);
  if (existingCookie) {
    // attempt to restore to localStorage too
    safeSetLocalStorage(KEY, existingCookie);
    return existingCookie;
  }

  // 3) create new
  const id =
    (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // store in both (cookie always, localStorage best-effort)
  setCookie(KEY, id);
  safeSetLocalStorage(KEY, id);

  return id;
}
