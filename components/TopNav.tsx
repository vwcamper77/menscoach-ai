"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type MeResponse = {
  email?: string | null;
  plan?: string;
  profile?: {
    onboardingComplete?: boolean;
    name?: string;
  };
};

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export default function TopNav() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/me", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const onboarded = Boolean(me?.profile?.onboardingComplete);
  const plan = me?.plan ?? "free";
  const isAuthed = Boolean(me?.email);
  const isLanding = pathname === "/";
  const showDashboard = isAuthed;
  const isAdmin = me?.email ? isAdminEmail(me.email) : false;

  async function startFresh() {
    const ok = window.confirm(
      "Start fresh on this device? This clears your local session and chat history on this browser."
    );
    if (!ok) return;

    await fetch("/api/session/reset", {
      method: "POST",
      credentials: "include",
    });

    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-slate-100">
          menscoach.ai
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link href="/chat" className="text-slate-300 hover:text-emerald-400 transition">
            Chat
          </Link>

          {/* Dashboard accessible once logged in so users can manage/delete account */}
          {showDashboard && (
            <Link
              href="/dashboard"
              className="text-slate-300 hover:text-emerald-400 transition"
              title={isAuthed ? "Open your dashboard" : "Sign in to access your dashboard"}
            >
              Dashboard
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin/dashboard"
              className="text-slate-300 hover:text-emerald-400 transition"
              title="Open admin dashboard"
            >
              Admin
            </Link>
          )}

          {!onboarded && (
            <Link href="/pricing" className="text-slate-300 hover:text-emerald-400 transition">
              Pricing
            </Link>
          )}

          {isAuthed && plan === "free" && onboarded && (
            <Link
              href="/pricing"
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Upgrade
            </Link>
          )}

          {/* Auth: Login/Register or Logout */}
          {!isAuthed ? (
            <Link
              href="/login"
              className="text-slate-300 hover:text-emerald-400 transition text-xs"
              title="Sign in or create your account"
            >
              Login / Register
            </Link>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-slate-400 hover:text-red-400 transition text-xs"
              title="Sign out"
            >
              Logout
            </button>
          )}

          {/* Anonymous-only: Start fresh */}
          {!isAuthed && !isLanding ? (
            <button
              onClick={startFresh}
              className="text-slate-500 hover:text-red-400 transition text-xs"
              title="Clears your local session on this browser"
            >
              Start fresh
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
