"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";

function getCallbackUrlFromLocation(): string {
  if (typeof window === "undefined") return "/chat";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("callbackUrl") ?? "/chat";
}

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/chat");

  useEffect(() => {
    setCallbackUrl(getCallbackUrlFromLocation());
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <TopNav />
      <section className="mx-auto max-w-lg px-6 py-14">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-3 text-slate-300">Continue with Google, or use email.</p>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 transition"
          >
            Continue with Google
          </button>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <label className="block text-sm text-slate-200">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </label>

            <button
              onClick={() => signIn("email", { email, callbackUrl })}
              className="mt-4 w-full rounded-xl border border-emerald-500/40 px-5 py-3 font-semibold text-emerald-200 hover:bg-emerald-500/10 transition"
            >
              Email me a sign-in link
            </button>

            <p className="mt-3 text-xs text-slate-400">If you don't see it, check spam.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
