# Consultation History Cards — Design

## Goal

Bring consultation history to the same "service module" pattern as Documents and Reviews: a small link-tile on the dashboard, and a clickable card grid on its own page — instead of today's plain text-row list.

## Background (confirmed by investigation)

- **Usage deduction already works.** `src/app/api/chat/route.ts:150` decrements `user.consultationsRemaining` by 1 on every successful chat answer, gated by a quota check at line 54. No change needed.
- **Usage display already exists.** The Package Limits card (dashboard section 1, `UsageRow` component) already shows "X / Y used, Z remaining" for consultations. No change needed.
- **No session/thread concept exists.** Each `Consultation` document (`src/lib/models/consultation.ts`) is one standalone question+answer pair — no `sessionId`/`threadId` links multiple chat turns together. Scope decision: treat each `Consultation` record as its own card ("session" = one record), not true multi-turn grouping. Building real session grouping is out of scope for this pass.
- **Real-time consistency is already guaranteed.** `/dashboard` and `/dashboard/consultations` are `force-dynamic` server components with no caching layer — every navigation re-fetches fresh data from MongoDB.

## Changes

### A. Dashboard section 4 restructure (`src/app/dashboard/page.tsx`)

Replace the current section-3 "Recent consultations" big list `Card` with nothing (remove it). Section 4 (currently a 2-tile row: Documents, Reviews) becomes a 3-tile row: **Consultation History | Generated Documents | Review Results** — all three using the identical small-tile markup already used for Documents/Reviews (`bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2`, icon + title + short description, `Link` to the respective page). The Consultation History tile always renders (services/review tiles stay behind their existing `showGenerate`/`showReview` flags; consultation history has no flag today, matching how the top quick-actions consultation tile is always shown).

Resulting dashboard order stays 4 sections:
1. Package limits
2. Services quick-actions (Consultation, Documents, Review)
3. *(removed — folded into section 4)*
4. Consultation History | Generated Documents | Review Results (3-tile row)

### B. `/dashboard/consultations` page → card grid + modal detail

- `src/app/dashboard/consultations/page.tsx` stays a server component: fetch `Consultation.find({ userId }).sort({ createdAt: -1 }).limit(100)` (unchanged query), pass plain serializable data to a new client component.
- New `src/app/dashboard/consultations/consultations-grid.tsx` (`"use client"`):
  - Renders a responsive grid (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`) of compact cards: question truncated to 2 lines (`line-clamp-2`) + formatted date, using the same `border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover` tile style as the service tiles, for visual consistency.
  - Clicking a card opens a `Dialog` (shadcn, same component used in `document-analysis-modal.tsx`) showing: full question, full answer (rendered through the existing `markdown-bold` helper if the answer contains `**bold**` markers — same renderer as the document-generation bold work), and the legal-basis/sources block (reusing the existing `groupItemsByArticle` grouping and source-link markup already present in the current page).
  - Empty state (no consultations yet) stays a single centered `Card` with a CTA to `/chat`, unchanged from today.
- No new API route, no new DB fields, no new page route — everything needed (question, answer, sources, createdAt) is already on the `Consultation` document fetched today.

### Out of scope (explicitly, to prevent scope creep)

- True multi-turn session grouping (`sessionId` field, grouped queries, chat-client changes) — flagged as a future item if ever needed, not built now.
- Any change to usage deduction or usage display — both already correct.
- Real-time push updates (websockets/polling) — SSR-per-request already satisfies "consistency across sessions."

## Testing

No test runner configured for this project. Verify with `npm run lint`, `npx tsc --noEmit`, and manual check in dev server: dashboard tile row renders 3 tiles, `/dashboard/consultations` renders a grid, clicking a card opens the modal with correct question/answer/sources, empty state still works for a user with zero consultations.
