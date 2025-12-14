import type { ReactNode } from "react";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "Privacy Policy | menscoach.ai",
  description:
    "Learn how menscoach.ai collects, uses, and protects your data. Conversation privacy, encryption, storage, and your rights.",
};

export default function PrivacyPage() {
  const lastUpdated = "14th December 2025";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopNav />

      <section className="max-w-4xl mx-auto px-6 py-16 space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">
            Privacy Policy
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">menscoach.ai Privacy Policy</h1>
          <p className="text-sm text-slate-400">Last updated: {lastUpdated}</p>
          <p className="text-base text-slate-300">
            menscoach.ai respects your privacy and is committed to protecting your personal
            data. This Privacy Policy explains what we collect, how we use it, and how we
            protect it. menscoach.ai is an AI-powered coaching tool inspired by the Better
            Masculine Man framework. It is not a therapy, medical, or crisis service.
          </p>
        </header>

        <div className="space-y-8">
          <Section
            number={1}
            title="What We Collect"
            body={
              <div className="space-y-4 text-slate-300">
                <p>We collect only what is necessary to operate the service.</p>
                <div className="space-y-2">
                  <p className="text-emerald-300 font-semibold">Information you provide</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Chat messages and coaching conversations</li>
                    <li>Optional profile information (such as goals or preferences)</li>
                    <li>Account details (such as email address if you create an account)</li>
                    <li>Payment information (handled by third-party payment providers, not stored by us)</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="text-emerald-300 font-semibold">
                    Information collected automatically
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Usage data (message counts, feature usage, timestamps)</li>
                    <li>Technical data such as browser type, device type, and IP address (for security and analytics)</li>
                  </ul>
                </div>
                <p className="text-emerald-300 font-semibold">
                  We do not sell your personal data.
                </p>
              </div>
            }
          />

          <Section
            number={2}
            title="How We Use Your Information"
            body={
              <div className="space-y-3 text-slate-300">
                <ul className="list-disc list-inside space-y-2">
                  <li>Provide AI coaching responses</li>
                  <li>Maintain conversation continuity and memory (if enabled on your plan)</li>
                  <li>Improve product performance and reliability</li>
                  <li>Manage subscriptions and access control</li>
                  <li>Ensure platform security and prevent abuse</li>
                </ul>
                <p>Your data is never used for advertising or sold to third parties.</p>
              </div>
            }
          />

          <Section
            number={3}
            title="Conversation Privacy and Encryption"
            body={
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>Coaching conversations and related memory are encrypted at rest using application-level encryption.</li>
                <li>Raw chat content is not readable directly in the database.</li>
                <li>Only the menscoach.ai application can decrypt conversation data in order to generate responses.</li>
                <li>Database administrators or third parties cannot view readable conversation content without the encryption keys.</li>
                <li>
                  Encryption protects stored data, but menscoach.ai must temporarily process message content in order to
                  generate responses.
                </li>
              </ul>
            }
          />

          <Section
            number={4}
            title="Data Storage and Retention"
            body={
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>Conversation data is stored only as long as needed to provide the service.</li>
                <li>Memory may be limited based on your subscription tier.</li>
                <li>Older messages may be summarised or deleted to reduce data retention.</li>
                <li>You may request deletion of your account and associated data at any time.</li>
              </ul>
            }
          />

          <Section
            number={5}
            title="AI Processing"
            body={
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>menscoach.ai uses AI models to generate coaching-style responses.</li>
                <li>Messages must be processed by the AI system to generate replies.</li>
                <li>AI responses are informational and reflective, not medical or therapeutic.</li>
                <li>menscoach.ai does not provide clinical diagnosis, treatment, or crisis intervention.</li>
                <li>
                  If you are experiencing emotional distress or feel unsafe, seek professional or emergency support
                  immediately.
                </li>
              </ul>
            }
          />

          <Section
            number={6}
            title="Third-Party Services"
            body={
              <div className="space-y-3 text-slate-300">
                <p>
                  We use trusted third-party services to operate the platform, including hosting, authentication, and
                  payment processors. These providers only receive the minimum data required to perform their role and
                  are contractually obligated to protect your information.
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Hosting and infrastructure providers</li>
                  <li>Authentication services</li>
                  <li>Payment processors (for subscriptions)</li>
                </ul>
              </div>
            }
          />

          <Section
            number={7}
            title="Cookies and Analytics"
            body={
              <ul className="list-disc list-inside space-y-2 text-slate-300">
                <li>Maintain sessions</li>
                <li>Understand usage patterns</li>
                <li>Improve performance</li>
              </ul>
            }
          />

          <Section
            number={8}
            title="Your Rights"
            body={
              <div className="space-y-3 text-slate-300">
                <p>Depending on your location, you may have the right to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Access your personal data</li>
                  <li>Request correction or deletion</li>
                  <li>Withdraw consent</li>
                  <li>Request data portability</li>
                </ul>
                <p>To exercise these rights, contact us using the details below.</p>
              </div>
            }
          />

          <Section
            number={9}
            title="Children’s Privacy"
            body={
              <p className="text-slate-300">
                menscoach.ai is intended for adults. We do not knowingly collect data from individuals under 18.
              </p>
            }
          />

          <Section
            number={10}
            title="Changes to This Policy"
            body={
              <p className="text-slate-300">
                We may update this Privacy Policy from time to time. Material changes will be communicated clearly on the
                site.
              </p>
            }
          />

          <Section
            number={11}
            title="Contact"
            body={
              <div className="text-slate-300 space-y-1">
                <p>If you have questions about this Privacy Policy or your data, contact:</p>
                <p className="font-semibold">menscoach.ai</p>
              </div>
            }
          />
        </div>
      </section>
    </main>
  );
}

function Section({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="space-y-3 border border-slate-800 rounded-2xl p-6 bg-slate-900/40">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center font-semibold">
          {number}
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-base leading-relaxed">{body}</div>
    </div>
  );
}
