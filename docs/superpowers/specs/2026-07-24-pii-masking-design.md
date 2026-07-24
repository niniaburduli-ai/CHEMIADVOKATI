# PII masking before OpenRouter calls

## Problem

All four AI-facing flows (chat, document generate, document review, review
improve) send user-authored free text straight to OpenRouter. That text
routinely contains personal data: an 11-digit personal ID, a phone number, an
email, a bank IBAN. None of it should leave this server in a form OpenRouter
(or any upstream provider it routes to) can read.

## Scope

Mask exactly four structured, deterministically-detectable PII types:

1. Personal ID — exactly 11 digits, word-bounded.
2. Phone number — exactly 9 digits, starting with `5`, word-bounded.
3. Email address.
4. Bank account — Georgian IBAN (`GE` + 2 digits + 2 letters + 16 digits).

Names, company/entity names, and physical addresses are explicitly **out of
scope**. Georgian script has no letter case, so the usual
capitalization-based heuristics for detecting proper nouns don't exist here,
and anything else reliable enough to try would risk mangling law text or
degrading answer quality — not worth the tradeoff. This is a deliberate,
scoped decision, not a placeholder for "add later" (if it's revisited, it
needs its own design pass, not a bolt-on to this one).

## Architecture

Two new pure-logic modules under `src/lib/privacy/`:

- `pii-mask.ts`
  - `maskPII(text: string): { masked: string; map: Map<string, string> }`
    — scans `text`, replaces each match with a tag (`[ID_1]`, `[PHONE_1]`,
    `[EMAIL_1]`, `[BANK_1]`), returns the masked text plus a tag→original map.
    The same original value always reuses the same tag within one call.
  - `unmaskPII(text: string, map: Map<string, string>): string` — replaces
    every `[TYPE_n]` tag in `text` with its original value from `map`.
    Unknown/foreign tags (a hallucinated `[ID_99]` the map has no entry for)
    are left as-is rather than stripped.
  - Detection order matters and is fixed: **email → bank IBAN → personal ID
    → phone**. Email must run before ID/phone: an email whose local part is
    11 digits (`12345678901@gmail.com`) would otherwise get consumed by the
    ID regex first, since `\b` sits at the boundary before the digits and
    OpenRouter never needs to distinguish "digits that happen to precede an
    @" from a real ID. Bank/ID/phone don't overlap by construction (IBAN's
    digit run is never at a word boundary — it's preceded by letters, which
    are also `\w`, so `\b\d{11}\b` can't start mid-token).
  - The map lives only for the duration of one request (a local variable in
    the route handler's closure). Never persisted, never logged, discarded
    once the response is sent.

- `pii-unmask-stream.ts`
  - `PiiUnmaskStream` — same incremental-buffering shape as the existing
    `DelimiterSplitter` (`src/lib/streaming/delimiter-splitter.ts`), but for
    an open-ended tag pattern instead of one fixed literal delimiter.
  - `push(chunk: string): string` — feeds a chunk, returns the portion safe
    to emit immediately. Any trailing `[` that hasn't yet been confirmed as
    either a complete tag or definitely-not-a-tag is held back until the
    next chunk resolves it, so a tag split across two SSE frames (e.g.
    `...text [ID` / `_1] more text...`) still gets restored correctly
    instead of leaking half a tag to the browser.
  - `finish(): string` — call once the source stream ends; runs one final
    replace pass on whatever's left in the buffer and returns it.

## Per-route wiring

The rule: **mask only the field the user actually typed for this request.**
Never run detection over retrieved law text, system prompts, or few-shot
examples — that content is trusted and static, and scanning it is wasted
work with a small chance of a coincidental match corrupting a citation.

- **`app/api/chat/route.ts`** — mask `question` once, right after schema
  validation. Use the masked version everywhere it currently flows
  downstream: `expandQuery`, the embedding-based semantic cache
  (`getCachedAnswer`/`setCachedAnswer`/`embedText`), `buildGroundedPrompt`,
  `searchWebContext`, `answerViaWebSearch` (both the inline NOT_FOUND
  fallback inside `runChatStream` and the top-level `tryWebFallback`), and
  the final `messages` array sent to `streamLegalAnswer`. Keep the
  **original, unmasked** `question` for `Consultation.create`.
  Unmasking: wrap the SSE writer in the `POST` handler's controller loop
  with one `PiiUnmaskStream` instance covering the whole request, pushing
  every chunk (`ev.type === "chunk"` from `runChatStream`, and the
  lastGoodProse-restore chunk) through it before encoding to the browser;
  clear/recreate it on a `{type: "reset"}` event so a partial tag held from
  a discarded tier attempt never bleeds into the next one. Separately,
  one-shot `unmaskPII` on `outcome.text` before it reaches
  `setCachedAnswer`/`Consultation.create` — those need the fully-resolved
  string, not a stream. `tryWebFallback` unmasks `web.answer.prose` the same
  one-shot way before caching/finalizing.

- **`app/api/generate/route.ts`** — mask `parsed.data.details` before
  building `userMsg`. The streamed document body already passes through a
  `DelimiterSplitter` (splitting off the trailing citations block) — chain a
  `PiiUnmaskStream` after it on the `safe` chunks before they reach
  `controller.enqueue`. One-shot `unmaskPII` on the final `content` and
  `legalBasis` strings before `GeneratedDocument.create` and the
  `encodeMeta` payload.

- **`app/api/review/route.ts`** — mask `text` (the extracted document body)
  before the analysis call. The original, unmasked `text` is what gets
  stored as `sourceText` — unaffected. One-shot `unmaskPII` on `raw` (the
  full model response) before `parseAnalysisResponse` runs, so the parsed
  `summary`/`findings`/`recommendations` carry real data.

- **`app/api/review/improve/route.ts`** — build `userMessage` from the
  original (unmasked) `baseText` + `findings` + `instruction` exactly as
  today via `buildImprovementUserMessage`, then mask the **whole composed
  string** in one pass right before the call. This is the one place where
  masking a composed string is correct rather than masking a single field
  first: every part of that composed message — the source document, the
  prior findings, the follow-up instruction — is user-or-user-doc-derived,
  with no trusted static content mixed in, so there's nothing at risk of
  false-positive corruption. One-shot `unmaskPII` on `raw` before
  `parseImprovementResponse`.

Nothing about `lib/ai-call.ts`, `lib/openrouter-stream-core.ts`,
`lib/legal/openrouter.ts`, `lib/legal/query-understanding.ts`,
`lib/legal/embeddings.ts`, or `lib/legal/document-analysis.ts` needs to
change beyond receiving already-masked strings at their existing
parameters — they stay oblivious to masking.

## System prompt addition

Add one line to each of the four system prompts (`SYSTEM_PROMPT` in
`legal/openrouter.ts`, `SYSTEM_KA`/`SYSTEM_EN` in `generate/route.ts`,
`ANALYSIS_SYSTEM_PROMPT` and `IMPROVEMENT_SYSTEM_PROMPT` in
`legal/document-analysis.ts`) instructing the model to reproduce any
`[TYPE_n]` token it sees exactly, verbatim — no translation, no
reformatting, no stripping the brackets. Cheap addition, meaningfully
reduces the chance a model mangles a tag before the unmask pass can find it.

## Explicitly not doing

- No masking of names, companies, or addresses (see Scope).
- No persistence of the tag↔original map anywhere (DB, logs, cache).
- No change to what gets stored in this app's own database — masking only
  affects what OpenRouter sees; our own DB always keeps the original,
  unmasked text (`sourceText`, `question`, `details` aren't even stored
  today for generate).
- No automated tests — this repo has no test runner configured. Verified
  manually: exercise each of the 4 endpoints with sample text containing all
  4 PII types embedded, confirm the masked payload (loggable at dev time)
  never contains the raw values, and confirm the final response/stored
  record has the real values back.
