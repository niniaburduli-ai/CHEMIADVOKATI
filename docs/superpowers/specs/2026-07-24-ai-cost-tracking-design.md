# AI Cost Tracking — Design

## Goal

Track the exact real-money cost of every OpenRouter call, so the admin panel can show:
1. **Consultation Cost** — per-consultation cost in the consultations table.
2. **Total AI Cost** — per-user sum across consultations, generated documents, and document reviews (including improve revisions), shown in the users table and the edit-user dialog.

## Cost source

OpenRouter's Usage Accounting feature: adding `usage: { include: true }` to a chat-completions request body makes OpenRouter return the real dollar cost it billed for that exact call, as `usage.cost` (USD; OpenRouter credits are 1:1 USD). This works for both non-streaming responses (in the final JSON body) and streaming responses (on the last SSE frame before `[DONE]`).

This avoids a self-maintained per-model price table — correct automatically for free-tier models ($0), the cheap/complex escalation tiers, and any future model swap, since OpenRouter itself computes it from whatever it actually billed.

**Fail-open:** if `usage.cost` is ever missing (upstream hiccup, a model that doesn't report cost), that call contributes `$0` to the total rather than throwing — consistent with this codebase's existing fail-open pattern for web search / citation verification.

## Call sites touched

Every function that talks to OpenRouter gains a cost return value. Non-streaming functions return `{ text, costUsd }` instead of a bare string; streaming generators return `costUsd` in their existing generator-return-value slot instead of `void`.

- `src/lib/legal/openrouter.ts`: `callOpenRouter`, `generateLegalAnswer`, `streamLegalAnswer`, `expandQuery` (in `query-understanding.ts`, calls `callOpenRouter`), `searchWebContext`, `answerViaWebSearch`, `verifyLegalCitations`
- `src/lib/openrouter-stream-core.ts`: `consumeSse` / `openOpenRouterStream` — capture the usage frame, expose via generator return
- `src/lib/ai-call.ts`: `callOpenRouterChat`, `streamOpenRouterChat`

## Per-feature cost accumulation

Each route sums **every** OpenRouter call that went into producing the record it saves — not just the call whose output was shown:

- **Chat** (`src/app/api/chat/route.ts`): query-expansion call + every answer-tier attempt actually tried (including ones discarded because they lacked a verified citation) + web-context search (if triggered) + web-fallback attempts (if the grounded pipeline came up empty). A cache hit costs $0 (no new OpenRouter call happens).
- **Generate** (`src/app/api/generate/route.ts`): the generation stream + citation verification call (0 when citations came from the doc-type cache).
- **Review** (`src/app/api/review/route.ts`): the analysis call.
- **Review/Improve** (`src/app/api/review/improve/route.ts`): the improve call, added on top of the review's existing `costUsd` via `$inc`.

OCR (Tesseract.js) and document text extraction (pdf-parse/mammoth) are local, not OpenRouter calls — no cost to track there.

## Schema changes

Add `costUsd: { type: Number, default: 0 }` to:
- `src/lib/models/consultation.ts`
- `src/lib/models/generated-document.ts`
- `src/lib/models/document-review.ts` (root-level running total; incremented on each improve call, not tracked per-revision)

Pre-existing rows default to 0 and render as "—" in the UI, the same treatment already used for `modelTier` on old consultations.

## Total AI Cost aggregation

Computed on demand in `src/app/admin/page.tsx` (not denormalized onto `User`, so it can never go stale): one `$group`-by-`userId`-and-`$sum`-`costUsd` aggregation per collection (Consultation, GeneratedDocument, DocumentReview), merged into each `UserRow` as `totalAiCostUsd`.

## UI changes

- `ConsultationsTable`: new "ღირებულება" (Cost) column.
- `GeneratedDocsTable` / `ReviewsTable`: same column, for symmetry — both feed the same Total AI Cost number, and the field already exists once the schema change lands.
- `UsersTable`: new "AI ხარჯი" column.
- `EditUserDialog`: read-only cost line, sourced from the same `UserRow` (no extra fetch).
- Shared `formatCostUsd(costUsd)` helper in `admin-dashboard.tsx`: converts to cents (`costUsd * 100`) and formats with enough decimals to stay non-zero for cheap calls (e.g. `0.0231¢`); `0`/untracked renders as `—`.

## Verification plan

No test runner in this project. Verify manually against the real OpenRouter API (dev server, real `OPENROUTER_API_KEY`):
1. Ask a chat question → confirm the saved `Consultation.costUsd` is a small positive number, and the admin consultations table renders it.
2. Generate a document → confirm `GeneratedDocument.costUsd` is set.
3. Run a document review, then improve it → confirm `DocumentReview.costUsd` increases after the improve call.
4. Load `/admin` → confirm the users table's AI-cost column matches the sum of that user's own records.
