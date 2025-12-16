# menscoach.ai

menscoach.ai is a Next.js app for a private AI coach built on Better Masculine Man principles. It handles onboarding, plan entitlements, subject-based threads, and Stripe upgrades while talking to OpenAI for replies.

## Features
- App Router UI: landing page, onboarding flow, subject-based chat, dashboard, and pricing.
- Session + profile: httpOnly `mc_session_id` cookie, onboarding profile persisted in Firestore.
- Coaching chat: `/api/chat` sends trimmed history and mode prompts to OpenAI gpt-4.1 with usage limits and memory.
- Subjects (Pro+): topic threads with mode selection, history, and persistent memory per subject.
- Billing hooks: Stripe Checkout session starter and webhook handlers to flip plans; pricing UI falls back to chat when checkout is unavailable.

## Tech stack
- Next.js 16 (App Router) with React 19 and Tailwind CSS 4.
- OpenAI Responses API (gpt-4.1).
- Firebase Admin + Firestore for sessions, memory, subjects, usage, and user profiles.
- Stripe for subscriptions (starter / pro / elite).
- TypeScript + ESLint.

## Prerequisites
- Node 18+ and npm 10+.
- Firebase project with Firestore enabled.
- OpenAI API key.
- Stripe account with three recurring prices.

## Environment
Create `.env.local` with your values:

```
OPENAI_API_KEY=sk-...

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ELITE=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Notes:
- Keep the `\n` escapes in `FIREBASE_PRIVATE_KEY` so the key parses correctly.
- The app sets the `mc_session_id` cookie; webhook writes plan data into the `mc_users` doc keyed by that id.

## Run locally
```
npm install
npm run dev
```
Visit http://localhost:3000.

Other scripts: `npm run lint`, `npm run build`, `npm run start`.

## Data model
- `mc_users`: plan, onboarding profile, stripe ids.
- `mc_sessions`: single-thread memory (name, goals, current challenge, recent turns).
- `mc_subjects/{subject}/messages`: per-subject threads for Pro/Elite.
- `mc_usage`: daily message counters used for plan limits.

## API map
- `GET/POST /api/session` � issues the httpOnly session cookie.
- `GET /api/me` � returns plan, entitlements, usage, onboarding profile.
- `POST /api/onboarding` � saves profile and marks onboarding complete.
- `POST /api/chat` � main chat handler; respects entitlements and subject modes.
- `GET/POST /api/subjects` � list/create subjects (Pro+).
- `GET /api/subjects/:id/messages` � fetch subject history.
- `POST /api/stripe/checkout` � starts Checkout for a plan; falls back to chat when Stripe is not configured.
- `POST /api/stripe/webhook` � updates plans on subscription events.

## Stripe webhook in dev
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.

## Resetting
If you want a clean slate locally, call `POST /api/session/reset` to drop the cookie; the next `/api/session` call will issue a new session id.


Yes thank you