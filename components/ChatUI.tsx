"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Role = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
};

type Props = {
  messages: ChatMessage[];
  isSending?: boolean;
  placeholder?: string;
  onSend: (payload: { text: string; subjectId?: string | null }) => Promise<void> | void;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  activeSubjectId?: string | null;
  disableInputMessage?: string | null;
};

export default function ChatUI({
  messages,
  isSending = false,
  placeholder = "Type what is on your mind...",
  onSend,
  header,
  sidebar,
  activeSubjectId = null,
  disableInputMessage = null,
}: Props) {
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const setOffsetVar = (offset: number) => {
      document.documentElement.style.setProperty(
        "--mc-vv-offset",
        `${Math.max(0, offset)}px`
      );
    };

    let lastOffset = 0;

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (offset === lastOffset) return;
      lastOffset = offset;
      setOffsetVar(offset);
      // Keep the latest message visible when the keyboard opens/closes.
      scrollToBottom();
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setOffsetVar(0);
    };
  }, [scrollToBottom]);

  const messageCount = messages.length;
  useEffect(() => {
    scrollToBottom();
  }, [messageCount, scrollToBottom]);

  const canSend = useMemo(() => {
    if (disableInputMessage) return false;
    return text.trim().length > 0 && !isSending;
  }, [text, isSending, disableInputMessage]);

  async function handleSend() {
    const value = text.trim();
    if (!value || isSending || disableInputMessage) return;

    setText("");
    requestAnimationFrame(() => inputRef.current?.focus());
    await onSend({ text: value, subjectId: activeSubjectId });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-50">
      {sidebar ? <div className="hidden md:block">{sidebar}</div> : null}

      <div className="flex-1 min-h-0 flex flex-col items-center">
        {header ? (
          <div className="w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur px-3 py-2">
            <div className="mx-auto w-full max-w-5xl">{header}</div>
          </div>
        ) : null}

        <div
          className="flex-1 min-h-0 w-full overflow-y-auto px-4 py-4"
          ref={scrollerRef}
        >
          <div className="mx-auto w-full max-w-5xl space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-fit max-w-[680px] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 text-slate-50"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {isSending ? (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-400 rounded-2xl px-3 py-2 text-sm animate-pulse">
                  menscoach.ai is thinking...
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          className="w-full border-t border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="mx-auto w-full max-w-5xl">
            {disableInputMessage ? (
              <div className="mb-2 text-xs text-amber-400">{disableInputMessage}</div>
            ) : null}
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                rows={1}
                className="flex-1 min-w-0 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 resize-none"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => requestAnimationFrame(scrollToBottom)}
                placeholder={placeholder}
                disabled={isSending || !!disableInputMessage}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className="shrink-0 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSending ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
