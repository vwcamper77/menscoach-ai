"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  profile?: {
    onboardingComplete?: boolean;
    name?: string;
  };
  plan?: string;
};

export default function TopNav() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const onboarded = Boolean(me?.profile?.onboardingComplete);
  const plan = me?.plan ?? "free";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Left */}
        <Link
          href="/"
          className="text-sm font-semibold tracking-wide text-slate-100"
        >
          menscoach.ai
        </Link>

        {/* Right */}
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/chat"
            className="text-slate-300 hover:text-emerald-400 transition"
          >
            Chat
          </Link>

          {onboarded && (
            <Link
              href="/dashboard"
              className="text-slate-300 hover:text-emerald-400 transition"
            >
              Dashboard
            </Link>
          )}

          {!onboarded && (
            <Link
              href="/pricing"
              className="text-slate-300 hover:text-emerald-400 transition"
            >
              Pricing
            </Link>
          )}

          {plan === "free" && onboarded && (
            <Link
              href="/pricing"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Upgrade
            </Link>
          )}

          <button
            onClick={async () => {
              await fetch("/api/session/reset", {
                method: "POST",
                credentials: "include",
              });
              window.location.href = "/";
            }}
            className="text-slate-400 hover:text-red-400 transition text-xs"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
