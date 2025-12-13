"use client";

// app/pricing/page.tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Top nav */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            menscoach.ai
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Open chat
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              Home
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-emerald-300/80">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            Your AI coach. On your terms.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70">
            Start free. Upgrade when you want structure, memory, and deeper coaching.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.key}
              className={[
                "relative rounded-3xl border p-5",
                p.highlight
                  ? "border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.15),0_0_60px_rgba(16,185,129,0.12)]"
                  : "border-white/10 bg-white/5",
              ].join(" ")}
            >
              {p.highlight ? (
                <div className="absolute -top-3 left-4 rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-black">
                  Recommended
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <p className="mt-1 text-sm text-white/65">{p.subtext}</p>
                </div>
              </div>

              <div className="mt-5">
                <div className="text-3xl font-semibold">{p.price}</div>
                <div className="mt-1 text-xs text-white/50">
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
                      ? "bg-emerald-400 text-black hover:bg-emerald-300"
                      : "border border-white/15 bg-white/5 hover:bg-white/10",
                  ].join(" ")}
                >
                  {p.ctaLabel}
                </button>
                <div className="mt-2 text-center text-[11px] text-white/45">
                  No payment wired yet? You will be routed to chat.
                </div>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm text-white/80">
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className={p.highlight ? "text-emerald-300" : "text-white/70"}>
                      <CheckIcon />
                    </span>
                    <span className="leading-snug">{b}</span>
                  </li>
                ))}
              </ul>

              {p.footnote ? (
                <p className="mt-4 text-xs text-white/55">{p.footnote}</p>
              ) : null}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-semibold">What are subjects?</h3>
            <p className="mt-2 text-sm text-white/70">
              Subjects are topic based chat threads like Work, Relationships, or Discipline.
              Each subject keeps its own history and memory.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-semibold">What are modes?</h3>
            <p className="mt-2 text-sm text-white/70">
              Modes are coaching styles. Direct. Calm. Presence focused. Choose the right tone
              for the subject you are working on.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm font-semibold">Can I cancel?</h3>
            <p className="mt-2 text-sm text-white/70">
              Yes. Cancel anytime. You keep access until the end of your billing period.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-semibold">
                Start free. Upgrade when it clicks.
              </h3>
              <p className="mt-1 text-sm text-white/70">
                The best upgrade moment is when you want the coach to remember you.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/chat"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold hover:bg-white/10"
              >
                Open chat
              </Link>
              <button
                type="button"
                onClick={() => handleUpgrade("pro", "/chat?upgrade=pro")}
                className="rounded-2xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-300"
              >
                Go Pro
              </button>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/45">
          Note: Billing wiring can be added next. This page is ready for Stripe Checkout when you are.
        </p>
      </div>
    </main>
  );
}
