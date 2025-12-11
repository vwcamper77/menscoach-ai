// src/app/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "menscoach.ai | An AI coach for men",
  description:
    "menscoach.ai is an AI coach for modern men. Build clarity, confidence and emotional strength with one guided conversation a day.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center">
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Early access • menscoach.ai
          </div>
        </header>

        <section className="grid gap-10 md:grid-cols-[3fr,2fr] md:items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-50 mb-4">
              An AI coach for men who want more{" "}
              <span className="text-emerald-400">clarity, strength and control</span>.
            </h1>
            <p className="text-sm md:text-base text-slate-300 mb-6 leading-relaxed">
              menscoach.ai gives you a private space to think out loud, get perspective,
              and make better decisions. One grounded conversation a day about what
              actually matters: your work, relationships, energy and direction.
            </p>

            <form className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="Enter your email for early access"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              />
              <button
                type="button"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
              >
                Join the early access list
              </button>
            </form>

            <p className="mt-3 text-xs text-slate-500">
              No spam. You’ll get updates as we roll out the first version of the AI coach.
            </p>

            <div className="mt-8 grid gap-3 text-xs md:text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <p>
                  Daily check-ins to get your head straight before work, after arguments,
                  or when you feel stuck.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <p>
                  Built specifically for men: boundaries, decisions, stress, focus, and
                  modern masculinity.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <p>
                  Private, judgment-free conversations. An AI coach that remembers you
                  and helps you make progress over time.
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-200 shadow-lg shadow-black/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
              What menscoach.ai will do
            </p>
            <ul className="space-y-3">
              <li className="border-b border-slate-800 pb-3">
                <span className="font-medium text-slate-50">
                  Ask you better questions.
                </span>
                <p className="mt-1 text-slate-300">
                  Not “how are you?” but “What’s actually weighing on you right now?” and
                  “What would progress look like today?”
                </p>
              </li>
              <li className="border-b border-slate-800 pb-3">
                <span className="font-medium text-slate-50">
                  Help you think, not tell you what to do.
                </span>
                <p className="mt-1 text-slate-300">
                  It reflects your own words back to you so you can see patterns, blind
                  spots and options more clearly.
                </p>
              </li>
              <li>
                <span className="font-medium text-slate-50">
                  Keep you accountable to the man you want to be.
                </span>
                <p className="mt-1 text-slate-300">
                  Track what you say matters to you – and nudge you back towards it when
                  life pulls you off course.
                </p>
              </li>
            </ul>

            <p className="mt-5 text-xs text-slate-500">
              menscoach.ai is not a therapist or a crisis service. It’s a practical,
              always-on coach for men who take their growth seriously.
            </p>
          </aside>
        </section>
      </div>
    </main>
  );
}
