# Document correction, diff view, download & correspondence history

Date: 2026-07-13

## Goal

Users can already ask the AI to fix risks it found in an uploaded document (`/api/review/improve`, storing revisions on `DocumentReview`). This feature makes that flow visible and complete:

1. Risk explanations read shorter.
2. After a correction round, the user sees what changed (colored diff), can download the corrected document, and can browse the full analyze → correct → correct-again cycle later in history.
3. The AI consultation chat gets a "view previous correspondence" button, and switching tabs on `/services` no longer wipes an in-progress chat/upload.

No new Mongoose model. No billing/quota changes (`improve` stays 1 credit/round).

## 1. Shorter risk explanations

`src/lib/legal/document-analysis.ts`: add one rule to both `ANALYSIS_SYSTEM_PROMPT` and `IMPROVEMENT_SYSTEM_PROMPT` — `explanation` capped at 1-2 short sentences (~25 words): the concrete problem and its consequence, no extra context. `recommendation`/`summary` unchanged (already short via `STRICT_BREVITY_RULE`). Prompt-only change, no UI truncation.

## 2. Diff engine

Add `diff` (jsdiff) to dependencies. New `src/lib/diff-text.ts`:

```ts
export type DiffSegment = { type: "same" | "added" | "removed"; text: string };
export function computeWordDiff(oldText: string, newText: string): DiffSegment[];
```

Wraps `Diff.diffWords`. Pure function; diffs are computed on read, never persisted.

## 3. Live correction UI (`document-analysis-modal.tsx`)

- `/api/review/improve` already computes `baseText` (previous revision's text, or original `sourceText` for round 1) before calling the AI. After getting `revisedText`, compute `diff = computeWordDiff(baseText, revisedText)` and return it alongside the revision in the JSON response (transient — not added to the Mongoose schema).
- New shared component `src/components/site/text-diff.tsx`: `TextDiff({ segments })` renders each segment as a `<span>` — unchanged text plain, added/changed text on a green background, removed text struck through in red/muted. Small legend line above it (2 new dict keys in `documentAnalysis`, ka+en).
- Replace the current `<pre>{revision.text}</pre>` block with `<TextDiff segments={diff} />`.
- Add `<DocumentDownloadButton content={revision.text} filename={...} />` (existing component, unchanged) next to the revised-text header, alongside the existing copy button.

## 4. History page (`dashboard/reviews`)

This page is plain Georgian-hardcoded, server-rendered, no client interactivity today. New pieces follow that same convention (no new i18n keys here).

- Server component computes, per review, a diff for every revision against its predecessor (`revisions[i-1]?.text ?? sourceText`), reusing `computeWordDiff`.
- New client component `src/app/dashboard/reviews/reviews-grid.tsx` (mirrors the existing `consultations-grid.tsx` pattern): each review card collapsed by default with an expand toggle. Expanded view shows, in order: original findings/recommendations (unchanged) → for each revision round: the user's instruction text, the colored diff, that round's findings/recommendations, and a download button.

## 5. "View previous correspondence" button

- New `GET /api/consultations` route (auth required): same query `dashboard/consultations/page.tsx` already runs (`Consultation.find({userId}).sort({createdAt:-1}).limit(100)`), returned as JSON. Needed because `ChatClient`/`AiConsultPanel` are client components without direct DB access.
- New shared component `src/components/site/previous-correspondence-panel.tsx`: a button (label: "წინა მიმოწერის ნახვა") that opens a `Sheet` (slide-over) listing past Q&A — collapsed by default, click-to-expand per item, reusing the same source-grouping/date-formatting approach as `consultations-grid.tsx`. On 401 (logged out), show a toast with a login link.
- Mounted at the top of both `ChatClient` (`/chat`) and `AiConsultPanel` (`/services` AI tab).

## 6. Tab-switch state persistence (`/services`)

`services-client.tsx` currently conditionally *mounts* the active panel (`{activeTab === "ai" && <AiConsultPanel/>}`), so switching to another tab and back destroys and recreates it, losing chat/upload state. Fix: keep all four panels mounted always; toggle visibility with `hidden` (CSS `display:none`) instead of conditional rendering. Applied uniformly to all four panels (AI, docs, templates, templatesFill), not just AI — same mechanism, no extra cost.

## Out of scope

Chat/generate prompt wording (kept as-is), export-with-highlighting (downloads stay clean/final-only), quota/billing changes.
