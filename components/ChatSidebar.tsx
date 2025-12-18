"use client";

import { useEffect, useMemo, useState } from "react";
import { Entitlements, Plan, getEntitlements } from "@/lib/entitlements";
import { Mode } from "@/lib/modes";
import { getOrCreateSessionId } from "@/utils/sessionId";

export type ChatListItem = {
  id: string;
  title: string;
  mode: Mode;
  createdAt?: number;
  updatedAt?: number;
  lastMessagePreview?: string;
};

type Props = {
  activeChatId?: string | null;
  onSelect: (chat: ChatListItem | null) => void;
  onPlanResolved?: (plan: Plan) => void;
  onEntitlementsResolved?: (entitlements: Entitlements) => void;
  onNewChat?: () => void;
  refreshKey?: number;
};

const INDEX_MESSAGE = "Finishing setup. Refresh in 1 minute.";

function formatModeLabel(mode: Mode) {
  return mode;
}

function formatUpdatedAt(value?: number) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatSidebar({
  activeChatId,
  onSelect,
  onPlanResolved,
  onEntitlementsResolved,
  onNewChat,
  refreshKey = 0,
}: Props) {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [plan, setPlan] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Entitlements>(
    getEntitlements("free")
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexBuilding, setIndexBuilding] = useState(false);

  const isPro = useMemo(() => (entitlements.maxSubjects ?? 0) > 0, [entitlements]);

  useEffect(() => {
    let aborted = false;

    async function loadChats() {
      setLoading(true);
      setError(null);
      setIndexBuilding(false);

      try {
        const sessionId = await getOrCreateSessionId();
        const res = await fetch("/api/subjects", {
          credentials: "include",
          headers: sessionId ? { "x-session-id": sessionId } : undefined,
        });

        const data = await res.json();

        if (res.ok) {
          const planFromServer = (data?.plan as Plan | undefined) ?? "pro";
          const entFromServer =
            (data?.entitlements as Entitlements | undefined) ??
            getEntitlements(planFromServer);

          if (aborted) return;

          setPlan(planFromServer);
          setEntitlements(entFromServer);
          onPlanResolved?.(planFromServer);
          onEntitlementsResolved?.(entFromServer);

          const list = (data?.subjects as ChatListItem[] | undefined) ?? [];
          setChats(list);

          if (list.length && !activeChatId) {
            onSelect(list[0]);
          }
        } else {
          const planFromError = (data?.plan as Plan | undefined) ?? "free";
          const entFromError =
            (data?.entitlements as Entitlements | undefined) ??
            getEntitlements(planFromError);

          setPlan(planFromError);
          setEntitlements(entFromError);
          onPlanResolved?.(planFromError);
          onEntitlementsResolved?.(entFromError);

          const friendly =
            data?.error?.code?.toUpperCase?.() === "INDEX_BUILDING" ||
            data?.error?.code?.toUpperCase?.() === "FAILED_PRECONDITION" ||
            data?.error?.code === 9;

          setIndexBuilding(friendly);
          setError(
            friendly ? INDEX_MESSAGE : data?.error?.message ?? "Upgrade required for chats."
          );
          setChats([]);
        }
      } catch (err: any) {
        const friendly =
          err?.code === 9 ||
          (typeof err?.code === "string" && err.code.toUpperCase() === "FAILED_PRECONDITION") ||
          (typeof err?.message === "string" &&
            err.message.toUpperCase().includes("FAILED_PRECONDITION"));

        setIndexBuilding(friendly);
        setError(friendly ? INDEX_MESSAGE : err?.message ?? "Failed to load chats.");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    void loadChats();

    return () => {
      aborted = true;
    };
  }, [activeChatId, refreshKey]);

  if (!isPro) {
    return null;
  }

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/90 backdrop-blur px-3 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-200">Chats</div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Pro</span>
      </div>

      <button
        type="button"
        onClick={() => {
          onSelect(null);
          onNewChat?.();
        }}
        className="w-full rounded-xl bg-emerald-500 text-slate-950 text-sm font-semibold py-2 hover:bg-emerald-400 transition"
      >
        New chat
      </button>

      {indexBuilding ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {INDEX_MESSAGE}
        </div>
      ) : null}

      {error && !indexBuilding ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {error}
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {loading ? (
          <div className="text-xs text-slate-500 px-1">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="text-xs text-slate-500 px-1">
            Start a new chat to get going.
          </div>
        ) : (
          chats.map((chat) => {
            const active = chat.id === activeChatId;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => onSelect(chat)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                  active
                    ? "bg-emerald-500/10 border-emerald-400/60 text-emerald-100"
                    : "bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-400/70"
                }`}
              >
                <div className="font-semibold truncate">{chat.title}</div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="capitalize">{formatModeLabel(chat.mode)}</span>
                  <span className="text-slate-600">•</span>
                  <span>{formatUpdatedAt(chat.updatedAt ?? chat.createdAt)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
