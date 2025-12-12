"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  onSend: (text: string) => Promise<void> | void;
  header?: React.ReactNode;
};

export default function ChatUI({
  messages,
  isSending = false,
  placeholder = "Type what is on your mind...",
  onSend,
  header,
}: Props) {
  const [text, setText] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const setOffsetVar = (offset: number) => {
      document.documentElement.style.setProperty(
        "--mc-vv-offset",
        `${Math.max(0, offset)}px`
      );
    };

    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffsetVar(offset);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setOffsetVar(0);
    };
  }, []);

  // Auto-scroll ONLY when a message is appended
  const messageCount = messages.length;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messageCount]);

  const canSend = useMemo(() => {
    return text.trim().length > 0 && !isSending;
  }, [text, isSending]);

  async function handleSend() {
    const value = text.trim();
    if (!value || isSending) return;

    setText("");
    requestAnimationFrame(() => inputRef.current?.focus());
    await onSend(value);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mc-chat-root">
      {header ? <div className="mc-chat-header">{header}</div> : null}

      <div ref={scrollerRef} className="mc-chat-messages" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`mc-bubble-row ${
              m.role === "user" ? "is-user" : "is-assistant"
            }`}
          >
            <div className="mc-bubble">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="mc-chat-inputbar">
        <input
          ref={inputRef}
          className="mc-chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus
          inputMode="text"
          autoCorrect="on"
          autoCapitalize="sentences"
        />

        <button
          type="button"
          className="mc-chat-send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send"
        >
          Send
        </button>
      </div>
    </div>
  );
}
