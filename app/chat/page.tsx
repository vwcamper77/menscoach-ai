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

function makeId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${rand}`;
}

export default function ChatPage() {
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);

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
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();

        if (cancelled) return;

        if (!data?.profile?.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }

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

  // Default opener for single-thread users
  useEffect(() => {
    if (!onboardingChecked) return;
    if (canUseSubjects) return;
    if (messages.length > 0) return;

    const defaultMode: Mode = "grounding";
    const openers = openerByMode[defaultMode];
    const opener = openers[Math.floor(Math.random() * openers.length)];

    setMessages([
      {
        id: makeId("assistant"),
        role: "assistant",
        content: opener,
      },
    ]);
  }, [canUseSubjects, messages.length, onboardingChecked]);

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

      {upgradeCTA ? (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-amber-500/20 border-t border-amber-400/50 px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="text-sm text-amber-100">
              {blockingError?.message ?? "Upgrade required to continue."}
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center rounded-lg bg-amber-400 text-slate-950 px-4 py-2 text-sm font-semibold hover:bg-amber-300"
            >
              View plans
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
