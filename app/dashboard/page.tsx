"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";

type Me = {
  plan?: string;

  // NEW
  email?: string | null;
  provider?: string | null;

  profile?: {
    name?: string;
    primaryFocus?: string;
    goal30?: string;
    preferredMode?: string;
  };
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // NEW
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [focusInput, setFocusInput] = useState("");
  const [goalInput, setGoalInput] = useState("");

  useEffect(() => {
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMe(data ?? null))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!me?.profile) return;
    setNameInput(me.profile.name ?? "");
    setFocusInput(me.profile.primaryFocus ?? "");
    setGoalInput(me.profile.goal30 ?? "");
  }, [me]);

  const name = me?.profile?.name || "Man";
  const focus = me?.profile?.primaryFocus || "Clarity";
  const goal = me?.profile?.goal30;
  const plan = me?.plan ?? "free";
  const preferredMode = me?.profile?.preferredMode;

  // NEW
  const email = me?.email ?? null;
  const provider = me?.provider ?? null;

  async function saveProfile() {
    setSaving(true);
    setSavedMessage(null);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          primaryFocus: focusInput.trim(),
          goal30: goalInput.trim(),
          preferredMode,
        }),
      });
      setSavedMessage("Saved");
      setMe((prev) =>
        prev
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                name: nameInput.trim(),
                primaryFocus: focusInput.trim(),
                goal30: goalInput.trim(),
                preferredMode,
              },
            }
          : prev
      );
    } catch {
      setSavedMessage("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  // NEW
  async function deleteAllData() {
    const ok = window.confirm(
      "Delete all your data? This cannot be undone."
    );
    if (!ok) return;

    setDeleting(true);
    setDeleteMessage(null);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        setDeleteMessage("Could not delete data. Try again.");
        return;
      }

      // Sign out after deletion
      window.location.href = "/api/auth/signout";
    } catch {
      setDeleteMessage("Could not delete data. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <TopNav />

      {/* HERO STRIP */}
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950" />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs uppercase tracking-widest text-emerald-300/80">
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-bold">
            Welcome back, {name}
          </h1>
          <p className="mt-4 max-w-xl text-slate-300">
            This is your space to orient yourself before you speak.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-slate-950 font-semibold hover:bg-emerald-400 transition"
            >
              Continue the work
            </Link>

            {plan === "free" && (
              <Link
                href="/pricing"
                className="rounded-xl border border-emerald-500/40 px-6 py-3 text-emerald-300 hover:bg-emerald-500/10 transition"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-300">Snapshot</div>
          <button
            type="button"
            onClick={() => setShowEditor((v) => !v)}
            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400/60 hover:text-emerald-200 transition"
          >
            {showEditor ? "Close editor" : "Edit dashboard"}
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Focus */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Current focus
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-emerald-400">
              {focus}
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              This is where your attention is being trained.
            </p>
          </div>

          {/* 30 day goal */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              30 day target
            </p>
            <p className="mt-3 text-sm text-slate-200 leading-relaxed">
              {goal || "No goal set yet. Clarify this in chat."}
            </p>
          </div>

          {/* Status */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Status
            </p>

            <p className="mt-3 text-sm text-slate-300">
              Plan:{" "}
              <span className="font-semibold uppercase text-white">
                {plan}
              </span>
            </p>

            {/* NEW */}
            <div className="mt-3 space-y-1">
              <p className="text-xs text-slate-400">
                Email:{" "}
                <span className="text-slate-200">
                  {email ? email : loading ? "Loading..." : "Not available"}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Signed in with:{" "}
                <span className="text-slate-200">
                  {provider ? provider : loading ? "Loading..." : "Not available"}
                </span>
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              menscoach.ai remembers what matters when you upgrade.
            </p>
          </div>
        </div>
      </section>

      {/* Editable profile */}
      {showEditor ? (
        <section className="mx-auto max-w-4xl px-6 pb-12">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  Edit dashboard
                </p>
                <p className="text-sm text-slate-300">Update what shows here.</p>
              </div>
              {savedMessage ? (
                <span className="text-xs text-emerald-300">{savedMessage}</span>
              ) : null}
            </div>

            <label className="block text-sm text-slate-200">
              Name
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block text-sm text-slate-200">
              Current focus
              <input
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="e.g. Discipline"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block text-sm text-slate-200">
              30 day goal
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                rows={3}
                placeholder="Example: Train 3x weekly and no doom scrolling after 10pm."
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </label>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setNameInput(me?.profile?.name ?? "");
                  setFocusInput(me?.profile?.primaryFocus ?? "");
                  setGoalInput(me?.profile?.goal30 ?? "");
                  setSavedMessage(null);
                }}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500/50 transition"
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving || loading}
                className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* NEW: Privacy */}
      <section className="mx-auto max-w-4xl px-6 pb-10">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            Privacy
          </p>

          <p className="mt-2 text-sm text-slate-300">
            You can delete your account data at any time.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={deleteAllData}
              disabled={deleting || loading}
              className="rounded-xl border border-red-500/40 px-5 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-60 transition"
            >
              {deleting ? "Deleting..." : "Delete all my data"}
            </button>

            {deleteMessage ? (
              <span className="text-xs text-red-200">{deleteMessage}</span>
            ) : null}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            This action cannot be undone.
          </p>
        </div>
      </section>

      {/* QUIET CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center">
          <p className="text-lg text-slate-200">
            "Clarity comes before confidence."
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Speak when you're ready.
          </p>

          <Link
            href="/chat"
            className="inline-block mt-6 rounded-xl bg-emerald-500 px-8 py-3 text-slate-950 font-semibold hover:bg-emerald-400 transition"
          >
            Open chat
          </Link>
        </div>
      </section>
    </main>
  );
}
