# Technical Plan — Legal Service for Georgians

AI-powered legal advice platform for Georgian citizens. Simple-language answers grounded in Georgian legislation. Subscription model: $5/month for 10 consultations.

## Stack
- Next.js 15 (App Router, TypeScript)
- Tailwind v4 + shadcn/ui
- MongoDB + Mongoose
- NextAuth.js v5 (Auth.js)
- Stripe (subscriptions)
- AI: OpenAI/Anthropic API + RAG over Georgian legislation

---

## Phase 1 — Frontend (UI only, mock data)

**Goal:** clickable shell, no backend.

1. `create-next-app` + Tailwind + shadcn init
2. Layout: header, footer, locale switch (ka/en, Georgian default)
3. Pages:
   - `/` landing (hero, features, pricing, testimonials)
   - `/login`, `/register`
   - `/dashboard` (consultation count, history)
   - `/chat` (consultation UI, mock responses)
   - `/legislation` (browse sources)
   - `/pricing`, `/billing`
4. shadcn components: Button, Card, Dialog, Form, Input, Toast, Sheet
5. Georgian font (FiraGO / BPG Nino Mtavruli), proper spacing
6. Theme: light/dark
7. Responsive mobile-first

**Deliverable:** static site, all routes navigable, mocked state.

---

## Phase 2 — Backend + Mongoose

**Goal:** persistence layer.

1. MongoDB Atlas cluster + `.env` (`MONGODB_URI`)
2. `lib/db.ts` — Mongoose singleton (avoid hot-reload reconnect)
3. Models:
   ```
   User { email, passwordHash, name, plan, consultationsRemaining, resetAt, createdAt }
   Consultation { userId, question, answer, sources[], createdAt }
   LegislationDoc { title, code, articleNumber, content, tags[], embedding }
   Subscription { userId, stripeCustomerId, stripeSubId, status, currentPeriodEnd }
   ```
4. API routes (`app/api/*`):
   - `/api/consultations` GET/POST
   - `/api/legislation` GET (search, filter)
   - `/api/user/me` GET
5. Zod validation on every input
6. Seed script for legislation (load from PDFs / scrape matsne.gov.ge)

**Deliverable:** CRUD works, dashboard reads real data.

---

## Phase 3 — Auth Module

**Goal:** registration, login, sessions.

1. NextAuth v5 with Credentials + Google providers
2. bcrypt password hash
3. JWT session strategy
4. Middleware `middleware.ts` — protect `/dashboard`, `/chat`
5. Email verification (Resend)
6. Password reset flow
7. Rate limit login (Upstash Redis)
8. Server actions for register/login forms

**Deliverable:** real auth, protected routes, sessions persist.

---

## Phase 4 — AI Integration (RAG)

**Goal:** legal answers grounded in Georgian law.

1. Ingest pipeline:
   - Scrape/load Georgian codes (Civil, Criminal, Labor, Tax) from matsne.gov.ge
   - Chunk by article (~500 tokens)
   - Embed via OpenAI `text-embedding-3-small`
   - Store in MongoDB Atlas Vector Search (or Pinecone)
2. Query flow:
   ```
   user question → embed → vector search top-k →
   build prompt with citations → LLM → answer + source refs
   ```
3. System prompt: "Respond in simple Georgian, cite article numbers, suggest lawyer for complex cases"
4. Model: Claude Sonnet 4.6 (good Georgian) or GPT-4o
5. Stream responses (Vercel AI SDK)
6. Save consultation + decrement counter atomically
7. Block if `consultationsRemaining <= 0`

**Deliverable:** working AI lawyer with citations.

---

## Phase 5 — Subscription / Billing

**Goal:** $5/mo = 10 consultations.

1. Stripe setup: product, price ($5/mo recurring)
2. Checkout flow:
   - `/api/stripe/checkout` → Stripe Checkout Session
   - Redirect back to `/billing/success`
3. Webhook `/api/stripe/webhook`:
   - `checkout.session.completed` → set plan, consultations = 10
   - `invoice.paid` → reset consultations = 10, push `resetAt`
   - `customer.subscription.deleted` → downgrade to free
4. Customer portal link (cancel / update card)
5. Free tier: 1 consultation/month (lead magnet)
6. UI: usage bar, upgrade CTA when low

**Deliverable:** paid users, auto-renewal, quota enforced.

---

## Phase 6 — Polish + Launch

1. SEO (Georgian metadata, sitemap, OG images)
2. Analytics (Plausible / PostHog)
3. Error tracking (Sentry)
4. Legal pages: ToS, Privacy (GDPR + Georgian data law)
5. Disclaimer banner: "AI-generated, not legal advice"
6. Admin panel: view users, refund, ban
7. Load test, deploy Vercel + MongoDB Atlas

---

## Risks
- **Legal liability** — strong disclaimer + lawyer-referral prompt for criminal/family cases
- **Georgian LLM quality** — test Claude vs GPT-4o on Georgian legal corpus before commit
- **Legislation updates** — schedule weekly ingest cron
- **Cost** — RAG cheaper than fine-tune; cap tokens per consultation (~2k)

## Order of Work
Phase 1 → 2 → 3 → 4 → 5 → 6. Each phase shippable standalone.
