"use client";

// app/pricing/page.tsx
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";

type PlanKey = "free" | "starter" | "pro" | "elite";

type Plan = {
  key: PlanKey;
  name: string;
  price: string;
  subtext: string;
  highlight?: boolean;
  ctaLabel: string;
  ctaHref: string; // fallback
  bullets: string[];
  footnote?: string;
};

const plans: Plan[] = [
  {
    key: "free",
    name: "Free",
    price: "£0",
    subtext: "Try the coach. Build the habit.",
    ctaLabel: "Start free",
    ctaHref: "/chat",
    bullets: [
      "10 messages per day",
      "Single chat thread",
      "Default coach mode",
      "No saved goals",
      "No summaries or insights",
      "No long term memory",
    ],
    footnote: "Best for getting a feel for the coach.",
  },
  {
    key: "starter",
    name: "Starter",
    price: "£7/mo",
    subtext: "Unlimited daily coaching. Keep it simple.",
    ctaLabel: "Go Starter",
    ctaHref: "/chat?upgrade=starter",
    bullets: [
      "Unlimited messages",
      "Single chat thread",
      "Default coach mode",
      "Save 1 active goal",
      "Short term session memory",
      "No subjects",
    ],
    footnote: "Best for consistency without structure.",
  },
  {
    key: "pro",
    name: "Pro",
    price: "£19/mo",
    subtext: "Structured coaching that remembers you.",
    highlight: true,
    ctaLabel: "Go Pro",
    ctaHref: "/chat?upgrade=pro",
    bullets: [
      "Unlimited messages",
      "Up to 5 subjects (topic based threads)",
      "Coach modes per subject",
      "Persistent memory per subject",
      "Weekly reflection summary",
      "Save goals and challenges",
    ],
    footnote: "Best value. The app starts feeling alive here.",
  },
  {
    key: "elite",
    name: "Elite",
    price: "£39/mo",
    subtext: "Your personal operating system.",
    ctaLabel: "Go Elite",
    ctaHref: "/chat?upgrade=elite",
    bullets: [
      "Unlimited messages",
      "Unlimited subjects",
      "Coach modes per subject",
      "Persistent memory per subject",
      "Weekly growth plan",
      "Guided journaling prompts",
    ],
    footnote: "Best for deep work and real transformation.",
  },
];

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  const router = useRouter();

  async function handleUpgrade(plan: PlanKey, fallbackHref: string) {
    if (plan === "free") {
      router.push(fallbackHref);
      return;
    }

    // If/when Stripe is wired, this route can exist.
    // If it fails (route missing or env not set), we fall back to /chat?upgrade=...
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) throw new Error("Stripe checkout not available");

      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout url returned");
    } catch {
      router.push(fallbackHref);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <TopNav />

      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/12 via-slate-900 to-slate-950" />
        <div className="relative mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            Your AI coach. On your terms.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200/80">
            Start free. Upgrade when you want structure, memory, and deeper coaching.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-slate-950 font-semibold hover:bg-emerald-400 transition"
            >
              Open chat
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-emerald-500/40 px-5 py-3 text-emerald-200 hover:bg-emerald-500/10 transition"
            >
              Home
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.key}
              className={[
                "relative rounded-3xl border p-5",
                p.highlight
                  ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_0_40px_rgba(16,185,129,0.12)]"
                  : "border-slate-800 bg-slate-900/50",
              ].join(" ")}
            >
              {p.highlight ? (
                <div className="absolute -top-3 left-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-slate-950">
                  Recommended
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-50">{p.name}</h2>
                  <p className="mt-1 text-sm text-slate-300">{p.subtext}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-3xl font-semibold text-slate-50">{p.price}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Cancel anytime. No long contracts.
                </div>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => handleUpgrade(p.key, p.ctaHref)}
                  className={[
                    "block w-full rounded-2xl px-4 py-2.5 text-center text-sm font-semibold transition",
                    p.highlight
                      ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      : "border border-slate-700 bg-slate-900/60 hover:border-emerald-400/50",
                  ].join(" ")}
                >
                  {p.ctaLabel}
                </button>
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  No payment wired yet? You will be routed to chat.
                </div>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm text-slate-200">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className={p.highlight ? "text-slate-950" : "text-emerald-300"}>
                      <CheckIcon />
                    </span>
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>

              {p.footnote ? (
                <p className="mt-4 text-xs text-slate-400">{p.footnote}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-50">What are subjects?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Subjects are topic based chat threads like Work, Relationships, or Discipline.
              Each subject keeps its own history and memory.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-50">What are modes?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Modes are coaching styles. Direct. Calm. Presence focused. Choose the right tone
              for the subject you are working on.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-sm font-semibold text-slate-50">Can I cancel?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Yes. Cancel anytime. You keep access until the end of your billing period.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold text-slate-50">
                Start free. Upgrade when it clicks.
              </h3>
              <p className="mt-1 text-sm text-slate-200/80">
                The best upgrade moment is when you want the coach to remember you.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/chat"
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-emerald-400/60 transition"
              >
                Open chat
              </Link>
              <button
                type="button"
                onClick={() => handleUpgrade("pro", "/chat?upgrade=pro")}
                className="rounded-2xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                Go Pro
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Note: Billing wiring can be added next. This page is ready for Stripe Checkout when you are.
        </p>
      </section>
    </main>
  );
}
