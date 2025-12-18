"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ChatUI, { ChatMessage } from "@/components/ChatUI";
import ChatSidebar, { ChatListItem } from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
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

function formatNameForOpener(name: string | null) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return capitalizeFirstLetter(trimmed);
}

function capitalizeFirstLetter(text: string) {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

function decapitalizeFirstLetter(text: string) {
  if (!text) return text;
  return text[0].toLowerCase() + text.slice(1);
}

function stripLeadingName(content: string, name: string) {
  const lowerName = name.toLowerCase();
  let remaining = content.trimStart();
  const prefixes = [
    `${lowerName},`,
    `hi ${lowerName}`,
    `hi, ${lowerName}`,
    `hey ${lowerName}`,
    `hello ${lowerName}`,
  ];

  let matched = true;
  while (matched) {
    matched = false;
    const lowerRemaining = remaining.toLowerCase();
    const prefix = prefixes.find((p) => lowerRemaining.startsWith(p));
    if (prefix) {
      remaining = remaining.slice(prefix.length).trimStart();
      if (remaining.startsWith(",")) remaining = remaining.slice(1).trimStart();
      matched = true;
    }
  }

  while (remaining.toLowerCase().startsWith(`${lowerName},`)) {
    remaining = remaining.slice(`${lowerName},`.length).trimStart();
  }

  return remaining;
}

function autoTitleFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "New chat";
  const words = trimmed.split(/\s+/).slice(0, 6);
  const title = words.join(" ");
  return capitalizeFirstLetter(title);
}

export default function ChatPage() {
  const router = useRouter();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [, setOnboardingComplete] = useState(false);
  const [, setOnboardingSkipped] = useState(false);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [singleThreadHydrated, setSingleThreadHydrated] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Entitlements>(
    getEntitlements("free")
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatListItem | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [blockingError, setBlockingError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);

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

    const nameForOpener = formatNameForOpener(profileName);
    const defaultMode: Mode = "grounding";
    const openers = openerByMode[defaultMode];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    const openerWithCase =
      nameForOpener && nameForOpener.length > 0
        ? decapitalizeFirstLetter(opener)
        : opener;
    const prefixed =
      nameForOpener && nameForOpener.length > 0
        ? `${nameForOpener}, ${openerWithCase}`
        : openerWithCase;

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
    singleThreadHydrated,
  ]);

  // If we learn the profile name after the opener was shown, patch the opener to include it.
  useEffect(() => {
    if (!profileName) return;
    if (canUseSubjects) return;
    if (messages.length === 0) return;

    const formatted = formatNameForOpener(profileName);
    if (!formatted) return;

    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      if (first.role !== "assistant") return prev;

      const stripped = stripLeadingName(first.content, formatted);
      const cleaned = decapitalizeFirstLetter(stripped);
      const nextContent = `${formatted}, ${cleaned}`;

      if (nextContent === first.content) return prev;

      const next = [...prev];
      next[0] = { ...first, content: nextContent };
      return next;
    });
  }, [profileName, canUseSubjects, messages]);
  // Load messages for active subject (Pro/Elite)
  useEffect(() => {
    if (!onboardingChecked) return;
    if (!canUseSubjects) return;

    if (!activeChat) {
      setMessages([]);
      return;
    }

    let aborted = false;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const sessionId = await getOrCreateSessionId();

        const res = await fetch(`/api/subjects/${activeChat.id}/messages`, {
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
              id: `${activeChat.id}-${m.createdAt ?? idx}`,
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
  }, [activeChat, canUseSubjects, onboardingChecked]);

  const createChatForMessage = useCallback(
    async (text: string): Promise<ChatListItem> => {
      const sessionId = await getOrCreateSessionId();
      const payload = {
        title: autoTitleFromText(text),
        mode: "grounding" as Mode,
      };

      const res = await fetch("/api/subjects", {
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

        throw new Error(message ?? "Could not start a new chat.");
      }

      const subject = data?.subject as ChatListItem | undefined;
      if (!subject) {
        throw new Error("Chat could not be created.");
      }

      setActiveChat(subject);
      setSidebarRefresh((n) => n + 1);
      return subject;
    },
    []
  );

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
        try {
          const chat = activeChat ?? (await createChatForMessage(text));
          payload.subjectId = chat.id;
        } catch (err: any) {
          setMessages((prev) => [
            ...prev,
            {
              id: makeId("assistant-error"),
              role: "assistant",
              content: err?.message ?? "Could not start a new chat.",
            },
          ]);
          return;
        }
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

        if (canUseSubjects) {
          const nowTs = Date.now();
          setActiveChat((prev) => (prev ? { ...prev, updatedAt: nowTs } : prev));
          setSidebarRefresh((n) => n + 1);
        }

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
    [activeChat, blockingError, canUseSubjects, createChatForMessage, isSending, onboardingChecked]
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
    ? activeChat
      ? `Chatting in ${activeChat.title}`
      : "Message menscoach.ai to start a new chat."
    : "Type what is on your mind...";

  const disableInputMessage = blockingError
    ? blockingError.message ?? "Upgrade required."
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
              canUseSubjects ? (
                <div className="mx-auto w-full max-w-6xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div>
                      Plan: <span className="font-semibold uppercase text-slate-200">{plan}</span>
                    </div>
                    <div className="text-slate-500">
                      Chats show newest first. Click title to rename.
                    </div>
                  </div>
                  <ChatHeader
                    chat={activeChat}
                    onUpdated={(updated) => {
                      setActiveChat(updated);
                      setSidebarRefresh((n) => n + 1);
                    }}
                    onDeleted={(id) => {
                      if (activeChat?.id === id) {
                        setActiveChat(null);
                        setMessages([]);
                      }
                      setSidebarRefresh((n) => n + 1);
                    }}
                    onRefreshSidebar={() => setSidebarRefresh((n) => n + 1)}
                  />
                </div>
              ) : (
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Single thread. {entitlements.dailyMessageLimit ?? "Unlimited"}{" "}
                    messages/day.
                  </div>
                </div>
              )
            }
            sidebar={
              canUseSubjects ? (
                <ChatSidebar
                  activeChatId={activeChat?.id}
                  onSelect={(subject) => {
                    setBlockingError(null);
                    setActiveChat(subject);
                    if (!subject) {
                      setMessages([]);
                    }
                  }}
                  onPlanResolved={(newPlan) => setPlan(newPlan)}
                  onEntitlementsResolved={(ent) => setEntitlements(ent)}
                  onNewChat={() => {
                    setActiveChat(null);
                    setMessages([]);
                    setBlockingError(null);
                    setFocusSignal((n) => n + 1);
                  }}
                  refreshKey={sidebarRefresh}
                />
              ) : null
            }
            activeSubjectId={activeChat?.id ?? null}
            disableInputMessage={disableInputMessage}
            focusSignal={focusSignal}
          />
        </div>
      </div>

    </main>
  );
}
