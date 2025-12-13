"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChatUI, { ChatMessage } from "@/components/ChatUI";
import SubjectsSidebar, { Subject } from "@/components/SubjectsSidebar";
import { getOrCreateSessionId } from "@/utils/sessionId";
import { Entitlements, getEntitlements, Plan } from "@/lib/entitlements";
import { Mode } from "@/lib/modes";
import TopNav from "@/components/TopNav";

type CoachingMode =
  | "grounding"
  | "discipline"
  | "relationships"
  | "business"
  | "purpose";

const openerByMode: Record<Mode, string[]> = {
  grounding: [
    "Slow down for a moment. What feels heaviest for you right now?",
    "Before we try to fix anything, what has really been sitting on your chest lately?",
  ],
  discipline: [
    "Where are you slipping on the standards you expect of yourself?",
    "What is one habit or pattern you know is holding you back at the moment?",
  ],
  relationships: [
    "Where in your relationships do you feel off centre or reactive?",
    "How satisfied are you with how you are showing up in your closest relationships?",
  ],
  business: [
    "Briefly describe your work and the main pressure or decision you are facing.",
    "What is the toughest call you are sitting on in your work or business right now?",
  ],
  purpose: [
    "If you zoomed out on your life, what question about direction keeps coming back?",
    "Where in your life do you feel most off track or unsure about your path?",
  ],
};

const SINGLE_THREAD_STORAGE_PREFIX = "mc-chat-single-";

function makeId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand}`;
}

function formatNameForOpener(
  name: string | null,
  onboarded: boolean,
  skipped: boolean
) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  // If onboarding was completed (and not skipped), use lowercase.
  // If onboarding was skipped or unknown, keep original casing.
  if (onboarded && !skipped) return trimmed.toLowerCase();
  return trimmed;
}

export default function ChatPage() {
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [singleThreadHydrated, setSingleThreadHydrated] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Entitlements>(
    getEntitlements("free")
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [blockingError, setBlockingError] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const canUseSubjects = useMemo(
    () => (entitlements.maxSubjects ?? 0) > 0,
    [entitlements]
  );

  // Ensure session exists
  useEffect(() => {
    void getOrCreateSessionId();
  }, []);

  // Onboarding gate
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (cancelled) return;

        if (!data?.profile?.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }

        setOnboardingComplete(Boolean(data?.profile?.onboardingComplete));
        setOnboardingSkipped(Boolean(data?.profile?.onboardingSkipped));
        if (data?.profile?.name) setProfileName(data.profile.name as string);

        // hydrate plan + entitlements early
        if (data?.plan) setPlan(data.plan as Plan);
        if (data?.entitlements)
          setEntitlements(data.entitlements as Entitlements);
      } catch {
        // If /api/me fails, do not block chat forever
      } finally {
        if (!cancelled) setOnboardingChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Restore single-thread chat from localStorage (for free users)
  useEffect(() => {
    if (!onboardingChecked) return;
    if (canUseSubjects) return;
    if (singleThreadHydrated) return;

    let cancelled = false;

    (async () => {
      try {
        const sessionId = await getOrCreateSessionId();
        if (!sessionId) return;
        const key = `${SINGLE_THREAD_STORAGE_PREFIX}${sessionId}`;
        const raw =
          typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
        if (raw) {
          const parsed = JSON.parse(raw) as ChatMessage[];
          if (!cancelled && Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSingleThreadHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onboardingChecked, canUseSubjects, singleThreadHydrated]);

  // Default opener for single-thread users
  useEffect(() => {
    if (!onboardingChecked) return;
    if (canUseSubjects) return;
    if (messages.length > 0) return;
    if (!singleThreadHydrated) return;

    const nameForOpener = formatNameForOpener(
      profileName,
      onboardingComplete,
      onboardingSkipped
    );
    const defaultMode: Mode = "grounding";
    const openers = openerByMode[defaultMode];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    const prefixed =
      nameForOpener && nameForOpener.length > 0
        ? `${nameForOpener}, ${opener}`
        : opener;

    setMessages([
      {
        id: makeId("assistant"),
        role: "assistant",
        content: prefixed,
      },
    ]);
  }, [
    canUseSubjects,
    messages.length,
    onboardingChecked,
    profileName,
    onboardingComplete,
    onboardingSkipped,
    singleThreadHydrated,
  ]);

  // If we learn the profile name after the opener was shown, patch the opener to include it.
  useEffect(() => {
    if (!profileName) return;
    if (canUseSubjects) return;
    if (messages.length === 0) return;

    const formatted = formatNameForOpener(
      profileName,
      onboardingComplete,
      onboardingSkipped
    );
    if (!formatted) return;

    const first = messages[0];
    if (first.role !== "assistant") return;
    const alreadyNamed =
      first.content.startsWith(`${formatted},`) ||
      first.content.startsWith(`Hi ${formatted}`);

    if (alreadyNamed) return;

    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[0] = { ...next[0], content: `${formatted}, ${next[0].content}` };
      return next;
    });
  }, [profileName, canUseSubjects, messages, onboardingComplete, onboardingSkipped]);
  // Load messages for active subject (Pro/Elite)
  useEffect(() => {
    if (!onboardingChecked) return;
    if (!canUseSubjects) return;

    if (!activeSubject) {
      setMessages([]);
      return;
    }

    let aborted = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const sessionId = await getOrCreateSessionId();

        const res = await fetch(`/api/subjects/${activeSubject.id}/messages`, {
          credentials: "include",
          headers: {
            ...(sessionId ? { "x-session-id": sessionId } : {}),
          },
        });

        const data = await res.json();

        if (!res.ok) {
          const code = data?.error?.code as string | undefined;
          const message = data?.error?.message as string | undefined;

          if (code === "UPGRADE_REQUIRED" || code === "LIMIT_REACHED") {
            setBlockingError({ code, message: message ?? "Upgrade required." });
          }
          throw new Error(message ?? "Could not load messages.");
        }

        const loaded =
          (data?.messages as {
            role: "user" | "assistant";
            content: string;
            createdAt?: number;
          }[]) ?? [];

        if (data?.plan) setPlan(data.plan as Plan);
        if (data?.entitlements)
          setEntitlements(data.entitlements as Entitlements);
        if (data?.profile?.name) setProfileName(data.profile.name as string);
        if (data?.profile?.onboardingComplete !== undefined)
          setOnboardingComplete(Boolean(data.profile.onboardingComplete));
        if (data?.profile?.onboardingSkipped !== undefined)
          setOnboardingSkipped(Boolean(data.profile.onboardingSkipped));

        if (!aborted) {
          setMessages(
            loaded.map((m, idx) => ({
              id: `${activeSubject.id}-${m.createdAt ?? idx}`,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch (err: any) {
        if (!aborted) {
          setMessages([
            {
              id: makeId("assistant-error"),
              role: "assistant",
              content: err?.message ?? "Could not load messages.",
            },
          ]);
        }
      } finally {
        if (!aborted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      aborted = true;
    };
  }, [activeSubject, canUseSubjects, onboardingChecked]);

  const handleSend = useCallback(
    async ({ text }: { text: string; subjectId?: string | null }) => {
      if (!onboardingChecked) return;
      if (isSending) return;
      if (blockingError) return;

      const sessionId = await getOrCreateSessionId();

      const payload: any = {
        messages: [{ role: "user" as const, content: text }],
      };

      if (canUseSubjects) {
        if (!activeSubject) {
          setBlockingError({
            code: "SUBJECT_REQUIRED",
            message: "Select or create a subject to start chatting.",
          });
          return;
        }
        payload.subjectId = activeSubject.id;
      } else {
        payload.mode = "grounding" as CoachingMode;
      }

      const userMessage: ChatMessage = {
        id: makeId("user"),
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { "x-session-id": sessionId } : {}),
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (data?.plan) setPlan(data.plan as Plan);
        if (data?.entitlements)
          setEntitlements(data.entitlements as Entitlements);

        if (!res.ok) {
          const code = data?.error?.code as string | undefined;
          const message = data?.error?.message as string | undefined;

          if (code === "LIMIT_REACHED" || code === "UPGRADE_REQUIRED") {
            setBlockingError({
              code,
              message: message ?? "Upgrade required.",
            });
          }
          throw new Error(message ?? "Request failed.");
        }

        const reply = (data.reply as string) ?? "Something went wrong.";

        const assistantMessage: ChatMessage = {
          id: makeId("assistant"),
          role: "assistant",
          content: reply,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId("assistant-error"),
            role: "assistant",
            content:
              err?.message ??
              "I hit a technical issue trying to reply. Try again in a moment.",
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [activeSubject, blockingError, canUseSubjects, isSending, onboardingChecked]
  );

  // Persist single-thread messages locally so navigation doesn't wipe them
  useEffect(() => {
    if (!onboardingChecked) return;
    if (canUseSubjects) return;
    let cancelled = false;

    (async () => {
      try {
        const sessionId = await getOrCreateSessionId();
        if (!sessionId) return;
        const key = `${SINGLE_THREAD_STORAGE_PREFIX}${sessionId}`;
        if (!cancelled && typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(messages));
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, onboardingChecked, canUseSubjects]);

  const placeholder = canUseSubjects
    ? activeSubject
      ? `Chatting in ${activeSubject.title}`
      : "Pick or create a subject to start."
    : "Type what is on your mind...";

  const disableInputMessage = blockingError
    ? blockingError.message ?? "Upgrade required."
    : canUseSubjects && !activeSubject
    ? "Select or create a subject to start chatting."
    : null;

  const upgradeCTA =
    blockingError &&
    (blockingError.code === "LIMIT_REACHED" ||
      blockingError.code === "UPGRADE_REQUIRED");

  if (!onboardingChecked) {
    return (
      <main className="h-dvh bg-slate-950 text-slate-50 flex items-center justify-center px-6">
        <div className="text-sm text-slate-400">Loading...</div>
      </main>
    );
  }

  return (
    <main className="h-dvh bg-slate-950 text-slate-50 flex flex-col">
      <TopNav />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 w-full mx-auto flex flex-col">
          <ChatUI
            messages={
              loadingMessages
                ? [
                    {
                      id: "loading",
                      role: "assistant",
                      content: "Loading messages...",
                    },
                    ...messages,
                  ]
                : messages
            }
            isSending={isSending}
            placeholder={placeholder}
            onSend={handleSend}
            footerBanner={
              upgradeCTA ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
                  <div className="flex-1">
                    {blockingError?.message ?? "Upgrade required to continue."}
                  </div>
                  <a
                    href="/pricing"
                    className="inline-flex items-center rounded-xl bg-amber-400 text-slate-950 px-3 py-2 text-xs font-semibold hover:bg-amber-300"
                  >
                    View plans
                  </a>
                </div>
              ) : null
            }
            header={
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
                <div className="text-xs text-slate-300">
                  Plan: <span className="font-semibold uppercase">{plan}</span>
                </div>

                {canUseSubjects ? (
                  <div className="text-xs text-slate-400">
                    {activeSubject
                      ? `Subject: ${activeSubject.title} (${activeSubject.mode})`
                      : "Select or create a subject to begin."}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Single thread. {entitlements.dailyMessageLimit ?? "Unlimited"}{" "}
                    messages/day.
                  </div>
                )}
              </div>
            }
            sidebar={
              canUseSubjects ? (
                <SubjectsSidebar
                  activeSubjectId={activeSubject?.id}
                  onSelect={(subject) => {
                    setBlockingError(null);
                    setActiveSubject(subject);
                  }}
                  onPlanResolved={(newPlan) => setPlan(newPlan)}
                  onEntitlementsResolved={(ent) => setEntitlements(ent)}
                />
              ) : null
            }
            activeSubjectId={activeSubject?.id ?? null}
            disableInputMessage={disableInputMessage}
          />
        </div>
      </div>

    </main>
  );
}
