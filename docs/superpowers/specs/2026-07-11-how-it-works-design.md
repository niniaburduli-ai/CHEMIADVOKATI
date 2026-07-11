# How It Works section — design

## Purpose

Add a "How it Works" section to the homepage, directly after the Services section, explaining the working principles and step-by-step usage instructions for all four services (AI consultation, document review, templates, custom document generation).

## Layout

Tabs, one per service. Clicking a tab shows that service's numbered steps + a CTA button. Visually validated against two alternatives (stacked blocks, accordion) via the brainstorming visual companion — tabs chosen. Matches the existing `ServicesModal` tab pattern already in the codebase, so it reads as consistent with the rest of the site rather than a new UI idiom.

## Data model

CMS-driven (Mongo, editable from `/admin`), matching the existing `hero`/`features`/`stats` pattern rather than the static i18n dict.

The 4 tabs are **locked to the 4 real service keys** (`chat`, `review`, `templates`, `generate`) — not a freeform admin-editable array. Reasons:
- These are the only 4 services that exist; a freeform array invites orphan tabs (content for a service that doesn't exist) or an admin accidentally deleting one of the real 4.
- Each tab's visibility should automatically follow that service's feature flag (`flags.chat`, `flags.review`, etc.), exactly like the Services section above it. A locked set makes that 1:1 mapping structural instead of something the admin has to keep in sync by hand.
- Icon and href/modal-trigger behavior are **not** CMS fields — they're hardcoded per key in the new component, mirroring `service-cards.tsx`'s `SERVICE_META`. Only the words (title, steps, CTA label) are editable. This keeps the tab's behavior (which route it links to, whether it opens the review modal) tied to code, not to admin-editable free text that could point at a dead route.

New fields on `HomePageData` (`src/types/cms.ts`):

```ts
export interface HomePageHowItWorksStep {
  text: string
  textEn?: string
}

export interface HomePageHowItWorksItem {
  key: "chat" | "review" | "templates" | "generate"
  title: string
  titleEn?: string
  steps: HomePageHowItWorksStep[]   // variable length per service (2-4), not forced uniform
  ctaText: string
  ctaTextEn?: string
}
```

Added to `HomePageData`:
- `sections.howItWorks: boolean` — section-level visibility toggle, same pattern as the other 5 section toggles
- `howItWorksHeading: string`, `howItWorksHeadingEn?: string`
- `howItWorks: HomePageHowItWorksItem[]` — always exactly 4 entries, one per key

Mongoose schema (`src/lib/models/HomePage.ts`): a `howItWorksStepSchema` (`text`, `textEn`) and `howItWorksItemSchema` (`key` enum, `title`/`titleEn`, `steps: [howItWorksStepSchema]`, `ctaText`/`ctaTextEn`), `{ _id: false }` like the other sub-schemas. Plus the two heading fields and the `sections.howItWorks` boolean (default `true`).

## Seed content (`src/lib/homepage-defaults.ts`)

Draft copy, ka + en, step count varies per service's real flow:

- **chat** (3 steps): open the chat → ask your legal question in plain language → get an instant AI answer grounded in current legislation
- **review** (3 steps): choose document or photo mode → upload your file(s) → get a categorized risk analysis and recommendations
- **templates** (2 steps): search or browse the template library → fill in your details and download
- **generate** (3 steps): describe your situation → AI drafts the document → review it, request a revision, or download

Exact wording finalized when writing seed data — will follow the tone of existing seed copy in the file.

## Backend/API

- `app/api/admin/cms/homepage/route.ts` GET handler already does manual per-field backfill for docs saved under an older schema (so existing published homepage docs don't lose the new section) — add `howItWorks` and `howItWorksHeading(/En)` to that backfill block, falling back to `HOME_SEED` values.
- PUT handler already does an unfiltered `$set` of the request body — no change needed there.
- `getHomePage()` in `src/lib/cms.ts` already does a generic `toPlain(doc)` pass-through — no special-casing needed for the new fields (unlike `serviceCards`, which needed href remapping for a legacy route; `howItWorks` has no legacy data to migrate).

## Admin UI (`src/components/admin/cms/HomePageForm.tsx`)

New section, same visual pattern as the existing Features section:
- Section visibility toggle (`sections.howItWorks`)
- Heading `BiInput`
- 4 fixed blocks (one per key, in `chat, review, templates, generate` order) — **no** add/remove/reorder controls on the blocks themselves, since the set is locked
- Per block: title `BiInput`, a steps list (each step is a ka/en text pair with its own add/remove, same interaction as the Plan "feature bullets" list), CTA text `BiInput`

## Frontend

New client component `src/components/site/how-it-works.tsx`, modeled on `service-cards.tsx`:
- Takes CMS items (already locale-picked in `page.tsx` via `pick()`) + `flags` + `locale`
- Hardcoded `SERVICE_META` map: `key → { icon, href | null }` (null href = opens `DocumentAnalysisModal`, same as the Services section's "review" card)
- Filters to enabled services via `flags`, same as `ServiceCards`
- Renders a tab bar (service titles) + the active tab's numbered steps + a CTA (Link for chat/templates/generate, button opening the modal for review)
- If zero items are enabled, renders nothing (same early-return pattern as `ServiceCards`)

`src/app/page.tsx` wiring:
- Fetch/pick `howItWorksHeading` the same way as `cardsHeading`/`featuresHeading`
- Render `<HowItWorks heading={...} items={...} flags={flags} locale={locale} />` immediately after `<ServiceCards .../>`, gated on `sections.howItWorks !== false && cmsData/seed howItWorks present` (falls back to seed like every other section)

## Out of scope

- No new feature flags — reuses the 4 existing ones
- No changes to `ServiceCards` itself or to the routes/modal it triggers
- No English-locale-specific Mongo document — bilingual fields follow the existing single-doc-with-`*En`-fields pattern used by the rest of `HomePageData`
