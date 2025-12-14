import { FirestoreAdapter } from "@auth/firebase-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { Resend } from "resend";
import { getFirestore } from "@/lib/firebaseAdmin";

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const allow = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

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

function buildVerificationEmail(opts: {
  firstName: string;
  loginUrl: string;
  unsubscribeUrl?: string;
}) {
  const subject = "Your menscoach.ai early access link";
  const greetingName = opts.firstName?.trim() || "there";
  const unsubscribeLine = opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : "";

  const text = [
    `Hi ${greetingName},`,
    "",
    "You are in. Here is your early-access link:",
    opts.loginUrl,
    "",
    "menscoach.ai is a private AI coaching tool built for clarity, discipline, and personal direction - no noise, no motivation spam.",
    "",
    "If this landed in spam, please move it to your inbox so future messages arrive correctly.",
    "",
    "If you did not request access, you can ignore this email or unsubscribe below.",
    "",
    "Thanks,",
    "Gavin",
    "Founder, menscoach.ai",
    "",
    unsubscribeLine,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6; background: #f8fafc; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
        <p style="margin: 0 0 12px 0;">Hi ${escapeHtml(greetingName)},</p>
        <p style="margin: 0 0 12px 0;">You are in. Here is your early-access link:</p>
        <p style="margin: 0 0 16px 0;"><a href="${escapeHtml(
          opts.loginUrl
        )}" style="color: #0f172a; font-weight: 600; text-decoration: none;">${escapeHtml(
    opts.loginUrl
  )}</a></p>
        <p style="margin: 0 0 12px 0;">menscoach.ai is a private AI coaching tool built for clarity, discipline, and personal direction - no noise, no motivation spam.</p>
        <p style="margin: 0 0 12px 0;">If this landed in spam, please move it to your inbox so future messages arrive correctly.</p>
        <p style="margin: 0 0 12px 0;">If you did not request access, you can ignore this email or unsubscribe below.</p>
        <p style="margin: 16px 0 4px 0;">Thanks,</p>
        <p style="margin: 0;">Gavin<br/>Founder, menscoach.ai</p>
      </div>
      ${
        opts.unsubscribeUrl
          ? `<p style="max-width: 560px; margin: 12px auto 0; font-size: 12px; color: #475569;">Unsubscribe: <a href="${escapeHtml(
              opts.unsubscribeUrl
            )}" style="color: #0f172a;">${escapeHtml(opts.unsubscribeUrl)}</a></p>`
          : ""
      }
    </div>
  `;

  return { subject, text, html };
}

export const authOptions: NextAuthOptions = {
  adapter: FirestoreAdapter(getFirestore()),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "login@menscoach.ai",
      maxAge: 24 * 60 * 60, // 24 hours
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
          throw new Error("Missing RESEND_API_KEY; cannot send sign-in email.");
        }

        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ??
          process.env.NEXTAUTH_URL ??
          "http://localhost:3000";
        const trimmedSiteUrl = siteUrl.endsWith("/")
          ? siteUrl.slice(0, -1)
          : siteUrl;
        const unsubscribeUrl =
          process.env.MC_UNSUBSCRIBE_URL ?? `${trimmedSiteUrl}/unsubscribe`;

        const { subject, html, text } = buildVerificationEmail({
          firstName: firstNameFromEmail(identifier),
          loginUrl: url,
          unsubscribeUrl,
        });

        const resend = new Resend(resendKey);
        const { error } = await resend.emails.send({
          from: provider.from ?? process.env.EMAIL_FROM ?? "login@menscoach.ai",
          to: identifier,
          subject,
          html,
          text,
          headers: unsubscribeUrl
            ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
            : undefined,
        });

        if (error) {
          throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      // Allow anyone to sign in; admin-only areas are guarded in the relevant routes/pages
      return true;
    },
    async jwt({ token, user }) {
      // Keep email on token
      if (user?.email) token.email = user.email;
      if (user?.id) (token as any).id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.email) {
        session.user.email = String(token.email);
      }
      if (session.user && (token as any)?.sub) {
        (session.user as any).id = String((token as any).sub);
      } else if (session.user && (token as any)?.id) {
        (session.user as any).id = String((token as any).id);
      }
      return session;
    },
  },
};
