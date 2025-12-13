// utils/sessionId.ts
let cachedSessionId: string | null = null;
let inFlight: Promise<string> | null = null;

async function fetchServerSession(): Promise<string> {
  const res = await fetch("/api/session", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to establish session");
  }

  const data = await res.json();
  if (typeof data?.sessionId !== "string") {
    throw new Error("Session missing in response");
  }

  return data.sessionId;
}

export async function getOrCreateSessionId(): Promise<string> {
  if (typeof window === "undefined") {
    // server components should never rely on this
    return "server";
  }

  if (cachedSessionId) return cachedSessionId;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const sessionId = await fetchServerSession();
      cachedSessionId = sessionId;
      return sessionId;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
