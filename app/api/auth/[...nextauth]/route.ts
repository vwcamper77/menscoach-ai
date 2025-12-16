import NextAuth, { type NextAuthOptions } from "next-auth";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { getFirestore } from "@/lib/firebaseAdmin";
import { mailer } from "@/lib/mailer";

/* ---------------- helpers ---------------- */

function firstNameFromEmail(email: string | null | undefined) {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z]+/g, " ").trim();
  const first = cleaned.split(" ")[0];
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] ?? char;
  });
}

/* ---------------- email templates ---------------- */

function buildVerificationEmail(opts: {
  firstName: string;
  loginUrl: string;
  unsubscribeUrl?: string;
}) {
  const subject = "Your menscoach.ai sign-in link";
  const name = opts.firstName || "there";

  const text = [
    `Hi ${name},`,
    "",
    "Here is your sign-in link:",
    opts.loginUrl,
    "",
    "If this landed in spam, move it to your inbox so future messages arrive correctly.",
    "",
    opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Hi ${escapeHtml(name)},</p>
    <p>Here is your sign-in link:</p>
    <p><a href="${escapeHtml(opts.loginUrl)}">${escapeHtml(opts.loginUrl)}</a></p>
    ${
      opts.unsubscribeUrl
        ? `<p style="font-size:12px;color:#666;">Unsubscribe: <a href="${escapeHtml(
            opts.unsubscribeUrl
          )}">${escapeHtml(opts.unsubscribeUrl)}</a></p>`
        : ""
    }
  </div>
  `;

  return { subject, text, html };
}

function buildWelcomeEmail(opts: { name?: string | null; email: string }) {
  const first = (opts.name || "").split(" ")[0] || firstNameFromEmail(opts.email);
  const subject = "Welcome to MensCoach AI";

  const text = [
    `Hi ${first},`,
    "",
    "Welcome to MensCoach AI.",
    "You can log in anytime at https://menscoach.ai",
    "",
    "If you need help, just reply to this email.",
    "",
    "MensCoach AI Support",
  ].join("\n");

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>Welcome, ${escapeHtml(first)}</h2>
    <p>Your account is ready.</p>
    <p><a href="https://menscoach.ai">Open menscoach.ai</a></p>
    <p style="margin-top:16px;">If you need help, just reply to this email.</p>
  </div>
  `;

  return { subject, text, html };
}

function buildAdminSignupEmail(opts: {
  email: string;
  name?: string | null;
  provider?: string | null;
}) {
  const subject = `New signup: ${opts.email}`;

  const text = [
    "New MensCoach AI signup",
    `Email: ${opts.email}`,
    `Name: ${opts.name ?? "-"}`,
    `Provider: ${opts.provider ?? "-"}`,
    `Time (UTC): ${new Date().toISOString()}`,
  ].join("\n");

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h3>New MensCoach AI signup</h3>
    <p><strong>Email:</strong> ${escapeHtml(opts.email)}</p>
    <p><strong>Name:</strong> ${escapeHtml(opts.name ?? "-")}</p>
    <p><strong>Provider:</strong> ${escapeHtml(opts.provider ?? "-")}</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
  </div>
  `;

  return { subject, text, html };
}

/* ---------------- mail sender ---------------- */

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  headers?: Record<string, string>;
}) {
  await mailer.sendMail({
    from: params.from ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER!,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: params.headers,
  });
}

/* ---------------- auth options ---------------- */

export const authOptions: NextAuthOptions = {
  adapter: FirestoreAdapter(getFirestore()),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    EmailProvider({
      from: process.env.EMAIL_FROM ?? "MensCoach AI <hello@menscoach.ai>",
      maxAge: 24 * 60 * 60,

      async sendVerificationRequest({ identifier, url, provider }) {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ??
          process.env.NEXTAUTH_URL ??
          "http://localhost:3000";

        const trimmed = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
        const unsubscribeUrl =
          process.env.MC_UNSUBSCRIBE_URL ?? `${trimmed}/unsubscribe`;

        const { subject, html, text } = buildVerificationEmail({
          firstName: firstNameFromEmail(identifier),
          loginUrl: url,
          unsubscribeUrl,
        });

        await sendEmail({
          from: provider.from ?? process.env.EMAIL_FROM,
          to: identifier,
          subject,
          html,
          text,
          headers: unsubscribeUrl
            ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
            : undefined,
        });
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return true;

      const email = user.email.toLowerCase().trim();
      const db = getFirestore();
      const ref = db.collection("mc_users").doc(email);
      const snap = await ref.get();
      const now = new Date();

      if (!snap.exists) {
        await ref.set({
          email,
          name: user.name ?? null,
          provider: account?.provider ?? null,
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now,
          welcomeEmailSentAt: null,
        });

        const welcome = buildWelcomeEmail({
          name: user.name ?? null,
          email,
        });

        await sendEmail({
          to: email,
          subject: welcome.subject,
          html: welcome.html,
          text: welcome.text,
        });

        if (process.env.ADMIN_NOTIFY_EMAIL) {
          const admin = buildAdminSignupEmail({
            email,
            name: user.name ?? null,
            provider: account?.provider ?? null,
          });

          await sendEmail({
            to: process.env.ADMIN_NOTIFY_EMAIL,
            subject: admin.subject,
            html: admin.html,
            text: admin.text,
          });
        }

        await ref.set(
          {
            welcomeEmailSentAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        return true;
      }

      await ref.set(
        { lastSeenAt: now, updatedAt: now },
        { merge: true }
      );

      return true;
    },
  },
};

/* ---------------- route handler ---------------- */

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
