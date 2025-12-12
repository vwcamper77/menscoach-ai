// utils/sessionId.ts
export function getOrCreateSessionId() {
  if (typeof window === 'undefined') return '';
  const key = 'menscoach-session-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}
