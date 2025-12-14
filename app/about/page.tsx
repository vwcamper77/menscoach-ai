// app/about/page.tsx
import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopNav />

      <section className="relative flex-1 px-6 py-20 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-slate-900 to-slate-950" />
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl space-y-10">
          {/* Header */}
          <header className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              About menscoach.ai
            </h1>
            <p className="text-slate-300 text-base md:text-lg">
              A calm, direct AI coach built to help modern men build discipline,
              presence, and purpose.
            </p>
          </header>

          {/* Content card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur p-8 md:p-10 space-y-8">
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Why it exists</h2>
              <p className="text-slate-300 leading-relaxed">
                Most guys do not need more motivation. They need clarity,
                consistency, and a plan they can actually follow. menscoach.ai is
                designed to feel like a grounded coach in your pocket: ask a
                question, get a straight answer, then take the next right step.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">What you can use it for</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>Breaking loops: procrastination, overthinking, distraction</li>
                <li>Better decisions: relationships, work, health, boundaries</li>
                <li>Daily structure: routines, habits, discipline systems</li>
                <li>Confidence: clear actions instead of endless thinking</li>
                <li>Reflection: journal prompts and honest feedback</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">How it feels</h2>
              <p className="text-slate-300 leading-relaxed">
                Calm. Firm. Practical. Not hype. Not therapy-speak. Just a
                supportive pressure toward your best self: truthful reflection,
                specific action steps, and accountability you can actually use.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Values</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { title: "Discipline", desc: "Do what you said you would do." },
                  { title: "Presence", desc: "Stay with what matters now." },
                  { title: "Responsibility", desc: "Own your outcomes." },
                  { title: "Integrity", desc: "No masks, no excuses." },
                  { title: "Strength", desc: "Calm nervous system, clear action." },
                  { title: "Service", desc: "Build a life that lifts others too." },
                ].map((v) => (
                  <div
                    key={v.title}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <p className="font-medium text-white">{v.title}</p>
                    <p className="text-sm text-slate-400 mt-1">{v.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Important note</h2>
              <p className="text-slate-300 leading-relaxed">
                menscoach.ai is for coaching and self-development. It is not a
                substitute for medical, mental health, legal, or financial
                advice. If you are in crisis or at risk of harm, contact local
                emergency services immediately.
              </p>
            </section>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
              >
                Start a chat
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 px-6 py-3 text-sm font-medium text-white hover:bg-slate-900/40 transition"
              >
                Contact
              </Link>
            </div>
          </div>

          {/* Footer links */}
          <div className="text-center text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-300 transition">
              Privacy Policy
            </Link>
            <span className="mx-2 text-slate-700">|</span>
            <Link href="/" className="hover:text-slate-300 transition">
              Home
            </Link>
            <span className="mx-2 text-slate-700">|</span>
            <Link href="/about" className="hover:text-slate-300 transition">
              About
            </Link>
            <span className="mx-2 text-slate-700">|</span>
            <Link href="/contact" className="hover:text-slate-300 transition">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
