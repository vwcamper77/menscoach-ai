// app/page.tsx

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* HERO SECTION */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] px-6 text-center overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 animate-gradient" />

        {/* Floating AI Orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-emerald-500/20 blur-3xl animate-pulse-slow" />

        {/* Glow line */}
        <div className="absolute top-1/2 left-1/2 w-[120%] h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent animate-glow" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl mx-auto space-y-6 mt-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Built on Better Masculine Man
          </p>

          <h1 className="text-4xl sm:text-6xl font-bold leading-tight">
            A Private AI Coach
            <br />
            <span className="text-emerald-400">For Modern Men</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
            menscoach.ai is a spin off from Better Masculine Man. 
            It carries the same core values and turns them into a private, on demand coaching conversation for men who want more clarity, discipline, and direction.
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <a
              href="/chat"
              className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
            >
              Start Chatting
            </a>
            <a
              href="#values"
              className="px-6 py-3 rounded-xl border border-slate-600 hover:border-emerald-400 hover:text-emerald-400 transition"
            >
              Explore The Values
            </a>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            Not therapy or clinical advice. Coaching style conversation only.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS / SOCIAL PROOF */}
      <section className="relative py-16 px-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10">
            Men use Better Masculine Man principles to level up their lives
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700">
              <p className="text-slate-300 text-sm">
                &quot;This helped me get out of a rut and make decisions I had been avoiding for months. menscoach.ai keeps me honest with myself.&quot;
              </p>
              <p className="mt-3 text-emerald-400 text-xs font-semibold">
                Alex, 32  - Product manager
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700">
              <p className="text-slate-300 text-sm">
                &quot;Feels like a grounded coach that actually understands what men are dealing with today. No fluff, just real reflection and next steps.&quot;
              </p>
              <p className="mt-3 text-emerald-400 text-xs font-semibold">
                Daniel, 41  - Business owner
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700">
              <p className="text-slate-300 text-sm">
                &quot;Not therapy, not hype. It has helped me stay disciplined, set boundaries, and show up better for my family.&quot;
              </p>
              <p className="mt-3 text-emerald-400 text-xs font-semibold">
                Sam, 29  - Father of two
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CORE VALUES SCROLL TIMELINE */}
      <section className="relative py-24 bg-slate-950 text-slate-100" id="values">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12">
            The Values menscoach.ai Is Built On
          </h2>
          <p className="text-center text-slate-400 max-w-2xl mx-auto mb-16">
            menscoach.ai is directly powered by the Better Masculine Man framework.
            Every answer, prompt, and reflection is influenced by these ten core values.
          </p>

          <div className="space-y-20 border-l border-slate-800 pl-6 ml-3">
            {[
              {
                title: "Responsibility",
                desc: "A man takes ownership of his life. No blame, no excuses. Responsibility creates trust, self-respect, and the foundation of leadership."
              },
              {
                title: "Presence",
                desc: "Attention without anxiety, listening without trying to fix, confidence without noise. Presence is power in a distracted world."
              },
              {
                title: "Discipline and Self-Mastery",
                desc: "True confidence comes from doing the difficult things you do not want to do. Physical, emotional, and mental discipline build an unshakeable core."
              },
              {
                title: "Purpose",
                desc: "Masculinity collapses without direction. menscoach.ai nudges you back toward mission, whether that is business, fatherhood, health, or inner work."
              },
              {
                title: "Strength With Compassion",
                desc: "Capability plus kindness. Boundaries plus empathy. Power plus emotional intelligence. This is the kind of strength the modern world needs from men."
              },
              {
                title: "Brotherhood",
                desc: "Men rise faster together than alone. While menscoach.ai is one to one, it is designed from a brotherhood mindset - challenge, support, and accountability."
              },
              {
                title: "Honour",
                desc: "Telling the truth, keeping your word, acting with integrity when no one is watching. Honour is the quiet force that makes a man admirable."
              },
              {
                title: "Growth Over Victimhood",
                desc: "Every setback is training, every failure is forge fire. Instead of feeding resentment, menscoach.ai helps you ask what this moment is here to teach you."
              },
              {
                title: "Embodiment",
                desc: "Masculinity must be lived, not just talked about. Breath, posture, energy, nervous system awareness - the coach will often bring you back into your body."
              },
              {
                title: "Contribution",
                desc: "Growth is not just for you. It is for your partner, your children, your friends, your work, your community. Masculinity is service centred, not self centred."
              }
            ].map((value, idx) => (
              <div
  key={idx}
  className={`relative mc-fade-in-up mc-delay-${Math.min(idx, 9)}`}
>

                {/* Timeline dot */}
                <div className="absolute -left-3 top-2 w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/30" />

                <h3 className="text-2xl font-semibold text-emerald-400 mb-2">
                  {value.title}
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  {value.desc}
                </p>
              </div>
            ))}

            {/* CTA at end of values */}
            <div className="text-center mt-24">
              <p className="text-slate-400 mb-6 text-lg">
                menscoach.ai carries the Better Masculine Man DNA into a private AI space 
                where you can be honest, untangle your thoughts, and plan simple next steps.
              </p>

              <a
                href="/chat"
                className="px-8 py-3 rounded-xl bg-emerald-500 text-slate-950 text-lg font-semibold hover:bg-emerald-400 transition"
              >
                Start Your Coaching Session
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>menscoach.ai is an AI coaching tool inspired by Better Masculine Man.</p>
        <p>Not a therapist. Not a crisis service. If you feel unsafe, contact local emergency support immediately.</p>
      </footer>
    </main>
  );
}
