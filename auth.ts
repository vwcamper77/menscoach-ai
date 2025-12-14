import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // Email magic link via Resend (only enabled when env vars are present)
    ...(process.env.RESEND_API_KEY && process.env.EMAIL_FROM
      ? [
          EmailProvider({
            from: process.env.EMAIL_FROM,
            async sendVerificationRequest({ identifier, url }) {
              if (!resend) throw new Error("RESEND_API_KEY is not set");

              await resend.emails.send({
                from: process.env.EMAIL_FROM!,
                to: identifier,
                subject: "Sign in to menscoach.ai",
                html: `
                  <p>Click the link below to sign in:</p>
                  <p><a href="${url}">Sign in</a></p>
                  <p>If you did not request this, you can ignore this email.</p>
                `,
              });
            },
          }),
        ]
      : []),
  ],

  adapter: FirestoreAdapter({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  }),

  session: { strategy: "jwt" },

  callbacks: {
    async signIn({ user, account }) {
      if (!user?.id) return false;

      const db = getFirestore();
      const ref = db.collection("mc_users").doc(user.id);

      // Only set createdAt once, but always update these
      const now = FieldValue.serverTimestamp();

      const existing = await ref.get();
      const createdAt = existing.exists ? existing.data()?.createdAt : now;

      await ref.set(
        {
          email: user.email ?? null,
          name: user.name ?? null,
          image: user.image ?? null,

          plan: existing.exists ? existing.data()?.plan ?? "free" : "free",
          onboardingComplete: Boolean(
            existing.exists ? existing.data()?.onboardingComplete : false
          ),

          provider: account?.provider ?? null,

          createdAt,
          updatedAt: now,
          lastLoginAt: now,
        },
        { merge: true }
      );

      return true;
    },

    // Ensure JWT contains the user id (token.sub)
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },

    // Ensure the session exposes the user id (useful for API lookups)
    async session({ session, token }) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};
