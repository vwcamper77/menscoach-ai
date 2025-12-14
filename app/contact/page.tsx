// app/contact/page.tsx
import Link from "next/link";
import TopNav from "@/components/TopNav";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">
      <TopNav />

      <section className="flex flex-col items-center justify-center flex-1 px-6 py-20">
        <div className="w-full max-w-xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Contact
            </h1>
            <p className="text-slate-400 text-base">
              Questions, feedback, or partnership enquiries. Reach out below.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur p-8 space-y-6">
            {/* Email */}
            <div className="space-y-1">
              <p className="text-sm text-slate-400">Email</p>
              <a
                href="mailto:support@menscoach.ai"
                className="text-emerald-400 hover:text-emerald-300 transition"
              >
                support@menscoach.ai
              </a>
            </div>

            {/* Purpose */}
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                We read every message. Typical reasons people reach out:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Account or access issues</li>
                <li>Product feedback or feature requests</li>
                <li>Press or partnership enquiries</li>
                <li>Ethical or data privacy questions</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <a
                href="mailto:support@menscoach.ai"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition"
              >
                Send an email
              </a>
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
