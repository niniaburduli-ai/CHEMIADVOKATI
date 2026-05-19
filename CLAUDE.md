# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js Version

This project pins `next@16.2.6` and `react@19.2.4`. Next.js 16 has breaking changes from 13/14/15 — App Router conventions, async APIs, caching defaults, and config shapes differ from older training data. **Before writing any Next.js-specific code, read the relevant doc under `node_modules/next/dist/docs/` (index at `index.md`, app router under `01-app/`).** Heed deprecation notices.

## Commands

```bash
npm run dev      # next dev (localhost:3000)
npm run build    # next build
npm run start    # next start (prod server)
npm run lint     # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

No test runner configured yet.

## Architecture

Project is an AI legal-advice SaaS for Georgian citizens. Full multi-phase plan lives in [plan.md](plan.md) — consult it before adding cross-cutting features so phase boundaries stay clean.

Current state: **Phase 1 only** — frontend shell with mocked data. No backend, no DB, no auth, no AI wired up yet.

### Stack
- Next.js 16 App Router (RSC enabled), React 19, TypeScript strict
- Tailwind v4 (via `@tailwindcss/postcss`) + shadcn/ui (style: `base-nova`, neutral base, CSS vars, lucide icons)
- Path alias `@/*` → `src/*`
- Planned (declared in `package.json`, not wired yet): `mongoose`, `next-auth@5-beta`, `@auth/mongodb-adapter`, `bcryptjs`, `stripe`, `@ai-sdk/anthropic` + `ai` (Vercel AI SDK), `zod`, `next-themes`, `sonner`

### Directory layout (`src/`)
- `app/` — App Router routes. One folder per page: `/`, `login`, `register`, `dashboard`, `chat`, `legislation`, `pricing`, `billing`. `layout.tsx` + `globals.css` at root.
- `components/ui/` — shadcn primitives (Button, Card, Dialog, Form, Input, Sheet, Sonner, etc.). Do not hand-edit; regenerate via shadcn CLI when possible.
- `components/site/` — app chrome (header, footer).
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge). New shared utilities belong here per `components.json` alias.

### Conventions
- shadcn aliases (from `components.json`): `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`. Respect them when generating components.
- Georgian-first UX: Georgian default locale, plan calls for FiraGO / BPG Nino Mtavruli fonts; English secondary.
- Light/dark theme via `next-themes` (planned).
- Each phase in [plan.md](plan.md) must remain shippable standalone — don't leak Phase 4 (AI) wiring into Phase 1 UI work.

### Backend conventions (planned, not yet implemented — follow when adding)
- Mongoose singleton in `lib/db.ts` to survive hot reload.
- Zod validation on every API route input.
- API routes under `app/api/*`.
- `middleware.ts` at project root for route protection (`/dashboard`, `/chat`).
- Stripe webhook at `app/api/stripe/webhook` — events must be idempotent (consultation counter resets, plan downgrades).

## Lint config note

`eslint.config.mjs` uses the new flat-config format and explicitly re-applies the default ignores (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`) inside a `globalIgnores(...)` call because spreading `eslint-config-next` overrides them. Keep that block if adding more configs.
