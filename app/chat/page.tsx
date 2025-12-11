// app/chat/page.tsx
"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I’m menscoach.ai. What’s on your mind today? You can start with whatever feels heaviest.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const newUserMessage: Message = { role: "user", content: trimmed };
    const historyToSend = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyToSend,
        }),
      });

      if (!res.ok) {
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <h1 className="text-sm font-semibold text-slate-100">
            menscoach.ai · <span className="text-emerald-400">Chat</span>
          </h1>
          <p className="text-[11px] text-slate-400">
            Not a therapist. If you’re in crisis, contact emergency services.
          </p>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-4xl px-4 py-4 flex flex-col gap-4">
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          {messages.map((m, index) => (
            <div
              key={index}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-50"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 resize-none"
              placeholder="Type what’s on your mind and press Enter to send. Shift+Enter for a new line."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSending ? "Thinking…" : "Send"}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            menscoach.ai can help you reflect and plan small next steps. It can’t diagnose
            or replace professional support.
          </p>
        </div>
      </div>
    </main>
  );
}
