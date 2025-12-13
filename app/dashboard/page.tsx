"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";

type Me = {
  plan?: string;
  profile?: {
    name?: string;
    primaryFocus?: string;
    goal30?: string;
  };
};

export default function DashboardPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const name = me?.profile?.name || "Man";
  const focus = me?.profile?.primaryFocus || "Clarity";
  const goal = me?.profile?.goal30;
  const plan = me?.plan ?? "free";

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
      <section className="mx-auto max-w-5xl px-6 py-12 grid gap-6 md:grid-cols-3">
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
          <p className="mt-2 text-xs text-slate-400">
            menscoach.ai remembers what matters when you upgrade.
          </p>
        </div>
      </section>

      {/* QUIET CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center">
          <p className="text-lg text-slate-200">
            “Clarity comes before confidence.”
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Speak when you’re ready.
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
