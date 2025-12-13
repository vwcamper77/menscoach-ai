"use client";

import { useEffect, useMemo, useState } from "react";
import { Mode, MODE_PROMPTS } from "@/lib/modes";
import { Entitlements, Plan, getEntitlements } from "@/lib/entitlements";
import { getOrCreateSessionId } from "@/utils/sessionId";

export type Subject = {
  id: string;
  title: string;
  mode: Mode;
  createdAt?: number;
};

type Props = {
  activeSubjectId?: string | null;
  onSelect: (subject: Subject | null) => void;
  onPlanResolved?: (plan: Plan) => void;
  onEntitlementsResolved?: (entitlements: Entitlements) => void;
};

function getDefaultMode(): Mode {
  return "grounding";
}

export default function SubjectsSidebar({
  activeSubjectId,
  onSelect,
  onPlanResolved,
  onEntitlementsResolved,
}: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [plan, setPlan] = useState<Plan>("free");
  const [entitlements, setEntitlements] = useState<Entitlements>(
    getEntitlements("free")
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>(getDefaultMode());
  const [creating, setCreating] = useState(false);

  const ent = useMemo(
    () => entitlements ?? getEntitlements(plan),
    [entitlements, plan]
  );
  const isPro = (ent.maxSubjects ?? 0) > 0;

  useEffect(() => {
    async function loadSubjects() {
      setLoading(true);
      setError(null);
      try {
        const sessionId = await getOrCreateSessionId();
        const res = await fetch("/api/subjects", {
          credentials: "include",
          headers: {
            ...(sessionId ? { "x-session-id": sessionId } : {}),
          },
        });
        const data = await res.json();
        if (res.ok) {
          const planFromServer = (data?.plan as Plan | undefined) ?? "pro";
          const entFromServer =
            (data?.entitlements as Entitlements | undefined) ??
            getEntitlements(planFromServer);
          setPlan(planFromServer);
          setEntitlements(entFromServer);
          onPlanResolved?.(planFromServer);
          onEntitlementsResolved?.(entFromServer);
          const list = (data?.subjects as Subject[] | undefined) ?? [];
          setSubjects(list);
          if (list.length && !activeSubjectId) {
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
          setError(data?.error?.message ?? "Upgrade required for subjects.");
          setSubjects([]);
        }
      } catch (err: any) {
        setError(err?.message ?? "Failed to load subjects.");
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setError(null);

    try {
      const sessionId = await getOrCreateSessionId();
      const res = await fetch("/api/subjects", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        body: JSON.stringify({ title: title.trim(), mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not create subject.");
      }
      const newSubject = data?.subject as Subject | undefined;
      const planFromServer = (data?.plan as Plan | undefined) ?? plan;
      const entFromServer =
        (data?.entitlements as Entitlements | undefined) ??
        getEntitlements(planFromServer);
      setPlan(planFromServer);
      setEntitlements(entFromServer);
      onPlanResolved?.(planFromServer);
      onEntitlementsResolved?.(entFromServer);
      if (newSubject) {
        setSubjects((prev) => [newSubject, ...prev]);
        onSelect(newSubject);
        setTitle("");
        setMode(getDefaultMode());
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not create subject.");
    } finally {
      setCreating(false);
    }
  }

  if (!isPro) {
    return null;
  }

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur px-3 py-4 space-y-4">
      <div>
        <div className="text-xs font-semibold text-slate-200 mb-2">
          Subjects
        </div>
        {loading ? (
          <div className="text-xs text-slate-500">Loading…</div>
        ) : subjects.length === 0 ? (
          <div className="text-xs text-slate-500">Create your first subject.</div>
        ) : (
          <div className="space-y-1">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                type="button"
                onClick={() => onSelect(subject)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition ${
                  subject.id === activeSubjectId
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-100"
                    : "bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-400/70"
                }`}
              >
                <div className="font-semibold">{subject.title}</div>
                <div className="text-xs text-slate-400 capitalize">
                  {subject.mode}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleCreate} className="space-y-2">
        <div className="text-xs font-semibold text-slate-200">New subject</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          placeholder="Title"
          disabled={creating}
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          aria-label="Mode"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
          disabled={creating}
        >
          {Object.keys(MODE_PROMPTS).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={creating || !title.trim()}
          className="w-full rounded-lg bg-emerald-500 text-slate-950 text-sm font-semibold py-2 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {creating ? "Creating…" : "Create subject"}
        </button>
      </form>

      {error ? (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
          {error}
        </div>
      ) : null}
    </aside>
  );
}
