"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateSessionId } from "@/utils/sessionId";
import { useVisualViewportOffset } from "@/utils/useVisualViewportOffset";

type Mode = "default" | "direct" | "calm" | "presence";

const focusOptions = [
  "Discipline",
  "Relationships",
  "Purpose/work",
  "Confidence",
  "Stress",
  "Health/body",
];

const modeOptions: { key: Mode; label: string; desc: string }[] = [
  { key: "direct", label: "Direct", desc: "Clear next actions and accountability." },
  { key: "calm", label: "Calm", desc: "Reflective and steady. Good for stress." },
  { key: "presence", label: "Presence", desc: "Embodiment, boundaries, grounded confidence." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  useVisualViewportOffset();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState("");
  const [preferredMode, setPreferredMode] = useState<Mode>("direct");
  const [goal30, setGoal30] = useState("");

  const canContinue = useMemo(() => {
    if (step === 1) return true;
    if (step === 2) return Boolean(primaryFocus);
    if (step === 3) return Boolean(preferredMode);
    if (step === 4) return Boolean(goal30.trim());
    return false;
  }, [step, primaryFocus, preferredMode, goal30]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Ensure the HttpOnly cookie session exists before calling /api/me
        await getOrCreateSessionId();

        const res = await fetch("/api/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json();

        if (cancelled) return;

        if (data?.profile?.onboardingComplete) {
          // Hard nav avoids router effect loops
          window.location.href = "/chat";
          return;
        }

        // Prefill if any
        setName(data?.profile?.name ?? "");
        setPrimaryFocus(data?.profile?.primaryFocus ?? "");
        setPreferredMode((data?.profile?.preferredMode ?? "direct") as Mode);
        setGoal30(data?.profile?.goal30 ?? "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, primaryFocus, preferredMode, goal30 }),
    });

    if (!res.ok) return;

    // Hard nav ensures we come back with the same cookie + server state
    window.location.href = "/chat";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-sm text-slate-400">Loading...</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-slate-950 text-white"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + var(--mc-vv-offset, 0px) + 24px)",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-200">menscoach.ai</div>
          <button
            className="text-sm text-slate-300 hover:text-emerald-400 transition"
            onClick={async () => {
              try {
                // Make sure cookie session exists
                await getOrCreateSessionId();

                // Mark onboarding complete with minimal data
                await fetch("/api/onboarding", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    onboardingComplete: true,
                    onboardingSkipped: true,
                    // optionally keep whatever they already typed
                    name,
                    primaryFocus,
                    preferredMode,
                    goal30,
                  }),
                });
              } finally {
                // Hard nav avoids router loop
                window.location.href = "/chat";
              }
            }}
          >
            Skip
          </button>
        </div>

        <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/40 p-7">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Get to know you
          </div>

          <h1 className="mt-3 text-3xl font-bold">
            90 seconds to personalise your coach
          </h1>

          <p className="mt-3 text-slate-400 text-sm">
            This helps the coach stay consistent and useful from day one.
          </p>

          <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-emerald-500/70" : "bg-slate-800"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-emerald-500/70" : "bg-slate-800"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-emerald-500/70" : "bg-slate-800"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 4 ? "bg-emerald-500/70" : "bg-slate-800"}`} />
          </div>

          {step === 1 && (
            <div className="mt-7">
              <h2 className="text-lg font-semibold">What should I call you?</h2>
              <p className="mt-2 text-sm text-slate-400">Optional.</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {step === 2 && (
            <div className="mt-7">
              <h2 className="text-lg font-semibold">What do you want to focus on first?</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {focusOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPrimaryFocus(opt)}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm transition",
                      primaryFocus === opt
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/30 hover:border-emerald-500/50",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mt-7">
              <h2 className="text-lg font-semibold">Choose a coaching style</h2>
              <div className="mt-4 space-y-3">
                {modeOptions.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPreferredMode(m.key)}
                    className={[
                      "w-full rounded-xl border px-4 py-3 text-left transition",
                      preferredMode === m.key
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/30 hover:border-emerald-500/50",
                    ].join(" ")}
                  >
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="mt-1 text-xs text-slate-400">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-7">
              <h2 className="text-lg font-semibold">One goal for the next 30 days</h2>
              <p className="mt-2 text-sm text-slate-400">
                Keep it simple and specific.
              </p>
              <textarea
                value={goal30}
                onChange={(e) => setGoal30(e.target.value)}
                rows={4}
                placeholder="Example: Train 3 times a week and stop doom scrolling at night."
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-base outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:border-emerald-500/60 transition"
              disabled={step === 1}
            >
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!canContinue}
                className={[
                  "rounded-xl px-5 py-2 text-sm font-semibold transition",
                  canContinue
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-400 cursor-not-allowed",
                ].join(" ")}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canContinue}
                className={[
                  "rounded-xl px-5 py-2 text-sm font-semibold transition",
                  canContinue
                    ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                    : "bg-slate-800 text-slate-400 cursor-not-allowed",
                ].join(" ")}
              >
                Finish
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Not therapy or clinical advice. Coaching style conversation only.
        </p>
      </div>
    </main>
  );
}
