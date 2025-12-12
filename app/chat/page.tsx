// app/chat/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { getOrCreateSessionId } from "@/utils/sessionId";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type CoachingMode =
  | "grounding"
  | "discipline"
  | "relationships"
  | "business"
  | "purpose";

const MODES: { id: CoachingMode; label: string; hint: string }[] = [
  {
    id: "grounding",
    label: "Grounding",
    hint: "Stress, overthinking, feeling off centre",
  },
  {
    id: "discipline",
    label: "Discipline",
    hint: "Habits, consistency, self sabotage",
  },
  {
    id: "relationships",
    label: "Relationships",
    hint: "Partner, dating, family dynamics",
  },
  {
    id: "business",
    label: "Business",
    hint: "Work, leadership, decisions",
  },
  {
    id: "purpose",
    label: "Purpose",
    hint: "Direction, mission, what is next",
  },
];

export default function ChatPage() {
  // Variations
  const headerVariants = [
    "menscoach.ai · Chat",
    "menscoach.ai · Coaching Chat",
    "menscoach.ai · Your Space",
    "menscoach.ai · Private Coaching",
    "menscoach.ai · The Work",
  ];

  const disclaimerVariants = [
    "Not a therapist. If you are in crisis, contact emergency services.",
    "Coaching only, not therapy. For emergencies, contact local services.",
    "Supportive conversation, not clinical care. In crisis, contact emergency services.",
    "Not therapy. For crisis situations, contact emergency services.",
  ];

  const openerByMode: Record<CoachingMode, string[]> = {
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

  // State
  const [mode, setMode] = useState<CoachingMode>("grounding");
  const [headerText, setHeaderText] = useState<string>(headerVariants[0]);
  const [disclaimerText, setDisclaimerText] = useState<string>(
    disclaimerVariants[0]
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: openerByMode["grounding"][0],
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Randomise header/disclaimer/opener after hydration
  useEffect(() => {
    const randomHeader =
      headerVariants[Math.floor(Math.random() * headerVariants.length)];
    const randomDisclaimer =
      disclaimerVariants[
        Math.floor(Math.random() * disclaimerVariants.length)
      ];

    const groundingOpeners = openerByMode["grounding"];
    const randomOpener =
      groundingOpeners[
        Math.floor(Math.random() * groundingOpeners.length)
      ];

    setHeaderText(randomHeader);
    setDisclaimerText(randomDisclaimer);

    setMessages((prev) => {
      if (!prev.length) {
        return [{ role: "assistant", content: randomOpener }];
      }
      const [first, ...rest] = prev;
      if (first.role !== "assistant") return prev;
      return [{ ...first, content: randomOpener }, ...rest];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Send
  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const sessionId = getOrCreateSessionId();
    const newUserMessage: Message = { role: "user", content: trimmed };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          mode,
          messages: [{ role: "user", content: trimmed }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Backend error:", res.status, text);
        throw new Error("Request failed");
      }

      const data = await res.json();
      const reply = (data.reply as string) || "Something went wrong.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I hit a technical issue trying to reply. Try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // UI
  return (
    <main className="h-dvh bg-slate-950 text-slate-50 flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-3 py-2 sm:px-4 sm:py-3">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2">
          <h1 className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
            {headerText}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-400 text-right">
            {disclaimerText}
          </p>
        </div>
      </header>

      {/* Mode selector */}
      <div className="border-b border-slate-800 bg-slate-950/95 px-2 sm:px-4 py-2">
        <div className="mx-auto w-full max-w-4xl flex flex-wrap justify-center sm:justify-start gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-xs border whitespace-nowrap transition ${
                mode === m.id
                  ? "bg-emerald-500 text-slate-950 border-emerald-400"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mx-auto w-full max-w-4xl mt-1 text-[10px] sm:text-[11px] text-slate-500 text-center sm:text-left">
          {MODES.find((m) => m.id === mode)?.hint}
        </p>
      </div>

      {/* Chat container */}
      <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col px-2 sm:px-4 pb-2 sm:pb-4 pt-2 sm:pt-3">
        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4 space-y-3 pb-40"
        >
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 text-[13px] sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-50"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-slate-800 text-slate-400 rounded-2xl px-3 py-2 text-[13px] sm:text-sm animate-pulse">
                menscoach.ai is thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="sticky bottom-0 left-0 right-0 pt-2 sm:pt-3 bg-slate-950/95 backdrop-blur z-20 border-t border-slate-800"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="mx-auto w-full max-w-4xl px-2 sm:px-4">
            <div className="flex items-end gap-2 sm:gap-3">
              <textarea
                rows={1}
                className="flex-1 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 resize-none"
                placeholder="Type what is on your mind…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-2 text-base sm:text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSending ? "…" : "Send"}
              </button>
            </div>

            <p className="mt-1 sm:mt-2 text-[10px] sm:text-[11px] text-slate-500">
              menscoach.ai helps you reflect and plan small next steps. It
              cannot diagnose or replace professional support.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
