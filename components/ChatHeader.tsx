"use client";

import { useEffect, useMemo, useState } from "react";
import { Mode, MODE_PROMPTS } from "@/lib/modes";
import { ChatListItem } from "./ChatSidebar";

type Props = {
  chat: ChatListItem | null;
  onUpdated?: (chat: ChatListItem) => void;
  onDeleted?: (chatId: string) => void;
  onRefreshSidebar?: () => void;
};

function titleFromChat(chat: ChatListItem | null) {
  return chat?.title ?? "Untitled chat";
}

export default function ChatHeader({ chat, onUpdated, onDeleted, onRefreshSidebar }: Props) {
  const [title, setTitle] = useState(titleFromChat(chat));
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>(chat?.mode ?? "grounding");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(titleFromChat(chat));
    setMode(chat?.mode ?? "grounding");
    setError(null);
  }, [chat]);

  const modeOptions = useMemo(() => Object.keys(MODE_PROMPTS) as Mode[], []);

  if (!chat) {
    return (
      <div className="flex items-center justify-center py-3 text-sm text-slate-500">
        Start a new chat to begin.
      </div>
    );
  }

  async function saveTitle(nextTitle: string) {
    if (!chat) return;
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === chat.title) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not rename chat.");
      }
      const updated = (data?.subject as ChatListItem) ?? { ...chat, title: trimmed };
      onUpdated?.(updated);
      onRefreshSidebar?.();
    } catch (err: any) {
      setError(err?.message ?? "Could not rename chat.");
    } finally {
      setSaving(false);
    }
  }

  async function saveMode(nextMode: Mode) {
    if (!chat) return;
    if (nextMode === chat.mode) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${chat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not update category.");
      }
      const updated = (data?.subject as ChatListItem) ?? { ...chat, mode: nextMode };
      setMode(updated.mode);
      onUpdated?.(updated);
      onRefreshSidebar?.();
    } catch (err: any) {
      setError(err?.message ?? "Could not update category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!chat) return;
    const ok = window.confirm("Delete this chat? This removes its history.");
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${chat.id}`, {
        method: "DELETE",
      });
      const data = res.ok ? null : await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not delete chat.");
      }
      onDeleted?.(chat.id);
      onRefreshSidebar?.();
    } catch (err: any) {
      setError(err?.message ?? "Could not delete chat.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void saveTitle(title)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base font-semibold text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          disabled={saving}
        />

        <select
          value={mode}
          onChange={(e) => void saveMode(e.target.value as Mode)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          disabled={saving}
        >
          {modeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleDelete}
          disabled={saving}
          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-60 transition"
        >
          Delete
        </button>
      </div>

      <div className="text-xs text-slate-500">
        {saving ? "Saving..." : "Click title to rename. Category controls tone."}
      </div>

      {error ? <div className="text-xs text-amber-400">{error}</div> : null}
    </div>
  );
}
