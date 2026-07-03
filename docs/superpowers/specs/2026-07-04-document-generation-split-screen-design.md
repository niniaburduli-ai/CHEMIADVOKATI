# Document Generation Split-Screen Redesign — Design

## Goal

Redesign `/generate` from a single-column form → static result stack into a split-screen workspace: structured per-type questions on the left, a live, editable, bold-aware document preview on the right, with a fullscreen pre-download preview.

## Current state (confirmed by code read)

- `src/app/generate/generate-client.tsx`: single column (`max-w-2xl`), one `<select>` for 6 fixed doc types, one free-text `Textarea` ("დეტალები"), a "შექმენი დოკუმენტი" button, and a result `Card` below with a read-only `<pre>` block (not editable), Copy + `.txt` download buttons.
- `src/app/api/generate/route.ts`: `POST { type, details }` → calls `callOpenRouterChat` with a Georgian system prompt that tells the model to mark unknown fields with `[BRACKETS]`; returns `{ id, title, content }` (201), persists a `GeneratedDocument`. `type` must be one of the keys in `DOC_TYPES` (`src/lib/validators.ts`).
- No markdown rendering anywhere on this page — any `**bold**` the model emits would show as literal asterisks (this already bit the consultation-history feature; a fix, `src/lib/markdown-bold.tsx`'s `renderMarkdownBold`, already exists in the codebase and will be reused here rather than rebuilt).
- No `PATCH`/update route exists for `GeneratedDocument` — edits today are not persisted anywhere.

## Decisions (from brainstorming)

1. **Per-type questions are a fixed, hardcoded schema** (not AI-generated). Each of the 6 doc types gets a `QUESTION_SCHEMAS` entry: a list of `{ key, label, type: "text" | "textarea" | "date" }` fields, plus a small "additional details" free-text fallback for anything the fields don't cover. Client-side, answers are joined into the same `details` string format the API already accepts (`"Label: value\n..."`) — **no backend schema change**.
2. **Edits persist to the database.** A new `PATCH /api/generate/[id]` route updates the `GeneratedDocument.content` field, zod-validated, ownership-checked via session — so the dashboard's document history reflects the user's edited version, not just the raw AI draft.
3. **View/edit is a toggle, not always-on WYSIWYG.** Default view renders `**bold**` as real `<strong>` (reusing `renderMarkdownBold`) with compact spacing (3+ consecutive newlines collapsed to one blank line). A pencil icon switches the same panel to a plain `Textarea` on the raw text for direct add/edit/delete; changes autosave (debounced ~1s + on blur) back through the new PATCH route.

## Changes

### A. `src/app/generate/generate-client.tsx` — split-screen layout

Replace the `max-w-2xl` single column with a responsive grid: `grid gap-6 lg:grid-cols-[380px_1fr]` (stacks to one column below `lg`). Left column: the existing header + type dropdown, now driven by `QUESTION_SCHEMAS[type]` instead of one static `Textarea`, plus the "additional details" fallback field and the Generate button — all in a `sticky top-4` `Card` on large screens. Right column: the document panel (see below), shown as an empty-state placeholder before first generation.

### B. New `QUESTION_SCHEMAS` (in `generate-client.tsx`, colocated with the existing `DOC_TYPES`/`PLACEHOLDER` maps)

One entry per doc type key (`complaint`, `rental-agreement`, `employment-contract`, `power-of-attorney`, `demand-letter`, `termination-notice`), each a short list (3-5 fields) of the most important structured facts for that document type (names, dates, amounts, addresses as applicable), typed `text`/`textarea`/`date`. On type change, the left panel re-renders its fields (state resets, matching today's existing reset-on-type-change behavior at `generate-client.tsx:117-121`). Field values assemble into the `details` string sent to `/api/generate` exactly as today's free-text box does — the API and validator (`GenerateDocSchema`, 10-2000 chars) are untouched.

### C. Document panel — view/edit toggle + word count

- **Rendered view (default):** a read-only `div` running the document text through `renderMarkdownBold` (from `@/lib/markdown-bold`, already exists) plus a client-side whitespace normalizer that collapses 3+ newlines to a single blank line. Shows a word count next to the existing character-style counter pattern already used on the input side (`generate-client.tsx:141`).
- **Edit view:** pencil-icon toggle switches to a `Textarea` bound to the raw `content` string (markdown markers visible, directly editable — add/remove text freely). Debounced autosave (~1s after the user stops typing) plus save-on-blur, both calling the new PATCH route.
- Copy and `.txt` download buttons stay, operating on the current `content` state (post-edit if edited).

### D. New `PATCH /api/generate/[id]` route

Zod-validated `{ content: string }` (reuse the 10-2000+ bound already used for generation — extend the max since edited legal documents can run longer than the AI's first draft; use a generous ceiling like 20000 chars). Verifies the `GeneratedDocument` belongs to `session.user.id` (404/403 otherwise), updates `content`, returns the updated document. No new fields, no new model.

### E. Fullscreen Preview

A "Preview" button (visible once a document exists) opens a `Dialog` (same pattern as `src/components/site/document-analysis-modal.tsx`), `className="sm:max-w-4xl h-[90vh] overflow-y-auto"`, showing the rendered (bold, compact-spaced) read-only document plus a Download button — a final check before leaving the page.

### F. Prompt change (`src/app/api/generate/route.ts` `SYSTEM` constant)

Update the instruction: use `**bold**` markdown for key variable data (names, dates, amounts, ID numbers) instead of `[BRACKETS]`; keep at most one blank line between sections/paragraphs (no excess spacing). This is the only change to the generation route itself — request/response shape is untouched.

## Out of scope (explicit)

- No change to the 6 fixed document types or the `GenerateDocSchema` validator's `type`/`details` shape.
- No AI-generated (dynamic) questions — schema is hardcoded per type, per the earlier decision.
- No full WYSIWYG contentEditable — edit mode is a plain textarea on raw text, per the earlier decision.
- No i18n dictionary migration for this page (it stays hardcoded Georgian strings, matching its current state and the rest of this page's existing convention).

## Testing

No test runner configured. Verify with `npm run lint`, `npx tsc --noEmit`, and a manual dev-server check: generate a document for at least 2 different types (confirm the right fields appear per type), confirm bold rendering, toggle to edit and back, confirm an edit persists after a page reload (via the PATCH route + re-fetch), open the fullscreen Preview, download the `.txt` and confirm its content matches the edited version.
