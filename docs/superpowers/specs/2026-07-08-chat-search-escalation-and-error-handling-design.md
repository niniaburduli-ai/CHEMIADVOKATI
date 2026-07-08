# Chat Legal-Answer Escalation & Error Handling — Design

## Goal

Fix two problems in the consultation chat pipeline (`src/app/api/chat/route.ts`):

1. Real law covers a question, but the cheap lexical keyword search misses it (wording mismatch, e.g. typo'd or informal phrasing) → user wrongly gets "not found in approved sources."
2. Infrastructure failures (matsne fetch blocked by WAF, both OpenRouter draft attempts throwing) are indistinguishable from a genuine "law doesn't address this" — both show the same `NOT_FOUND_MSG`, which reads as if the service searched thoroughly and came up empty, when actually it never got to search at all.

## Note: reconciled with existing uncommitted work

The working tree already has uncommitted changes (not from this design session) adding cheap→expensive model escalation: `route.ts` tries `ANSWER_MODEL` (cheap) first, and only retries with `ANSWER_MODEL_COMPLEX` (expensive) when `hasVerifiedCitation` (new helper, `citations.ts`) finds the cheap answer's citations don't match any provided source article. This is kept as-is — it already solves cost-tiering ("smart routing") and is orthogonal to both problems above. Confirmed by reading current `route.ts`: that escalation loop only ever operates on `matches` computed once, before it runs — if `matches` is empty (problem 1's exact scenario), **neither** the cheap nor the expensive attempt can ever ground a citation, no matter how good the model is, because there's no text to cite from. So this design adds a further fallback tier *after* that existing retry, not a competing mechanism.

## Fix 1: stop hard-failing on a lexical miss

`route.ts` currently returns `NOT_FOUND_MSG` immediately when `searchSources` finds zero matches (the `if (matches.length === 0) { return ... }` block, right after the `matches` assignment) — before any model ever sees the question. Remove this early return. Let the pipeline continue with `matches` possibly `[]`; `buildGroundedPrompt` already handles an empty `sources` array (produces an empty text block), and `SYSTEM_PROMPT` rule 1 already tells the model to refuse when there's no supporting text — so behavior is unchanged for a genuine no-match case *unless* Fix 2 below rescues it.

## Fix 2: Tier 2 fallback — web-verify against matsne.gov.ge

New function `verifyChatAnswer(question)` in `openrouter.ts`, sibling to the existing `verifyLegalCitations` (same shape: `WEB_MODEL()`, 20s abort, fail-open to `null` on any error/disabled/missing-key). It:

1. Drafts an answer using the model's own general Georgian-law knowledge (no "answer only from provided text" gate — this is specifically for when no local text was available to begin with).
2. Confirms it via a targeted web search **restricted to matsne.gov.ge / www.matsne.gov.ge only** (reuses `isAllowedHost`, not a new trust boundary) to verify the cited articles genuinely exist and say what's claimed.
3. Returns `{ prose, citations, url }` on success, or `null` if nothing could be confirmed or the call itself failed.

**Trigger condition (narrow, to avoid redundant spend):** only called when, after the existing cheap→expensive retry completes, the final `answer` is still `NOT_FOUND_MSG` **and** `matches.length === 0`. If `matches` was non-empty but citations still didn't verify, that's the existing retry's job (the right law was already in hand, a web-verify wouldn't add anything) — Tier 2 does not fire in that case, so it never doubles cost on a case the existing escalation already owns.

If `verifyChatAnswer` returns a confirmed answer, it wins. If it returns `null` cleanly (no throw), that's now a *genuine* `NOT_FOUND_MSG` — local text was empty, cheap model missed it, expensive model missed it, and a live web-verify against the actual registry still found nothing. If the call throws, that's a technical error (Fix 3), never silently downgraded to `NOT_FOUND_MSG`.

## Fix 3: technical error vs. genuine not-found

New constant in `openrouter.ts`:

```ts
export const TECHNICAL_ERROR_MSG =
  "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.";
```

Spots that currently conflate infra failure with genuine not-found, updated:

- `fetched.length === 0` (all approved-source fetches failed) — after the retry in Fix 4, this always means matsne was unreachable, not that the law is silent. Switches from `NOT_FOUND_MSG` to `TECHNICAL_ERROR_MSG`.
- The final `catch` in the existing escalation retry (currently: both cheap and expensive draft calls threw, `prose` still empty → returns `NextResponse.json({ error: "AI service unavailable", detail }, { status: 502 })`). Changes to `NextResponse.json({ answer: TECHNICAL_ERROR_MSG, legalBasis: [] }, { status: 200 })` — same response shape as every other branch in this route, so the client needs no special-case status handling.
- A thrown (not clean-`null`) `verifyChatAnswer` call in Fix 2.

**Quota unaffected:** `Consultation.create` / `consultationsRemaining` decrement already only runs after a full successful answer, past every early return. Both `NOT_FOUND_MSG` and `TECHNICAL_ERROR_MSG` return before that code, so neither ever deducts — confirmed by reading the current route, no change needed here.

## Fix 4: retry + circuit breaker on fetch (cost-saving)

- **One extra retry** around the `Promise.all(selected.map(fetchApprovedSource...))` batch: if every fetch in the batch fails, wait ~800ms and retry the whole batch once before declaring a technical error. `fetchApprovedSource` already retries twice internally per URL ([fetch-source.ts:21](../../../src/lib/legal/fetch-source.ts#L21)); this adds one layer above that for transient WAF blips.
- **Circuit breaker:** small in-memory counter (same `globalThis` pattern as the existing fetch cache) tracks consecutive full-batch failures. After 3 in a row, skip fetch attempts entirely for 2 minutes and return `TECHNICAL_ERROR_MSG` immediately — avoids hammering matsne during a real outage and avoids burning model calls on requests already doomed to fail. Resets on any success.

## Fix 5: cache TTL

`TTL_MS` in `fetch-source.ts` goes from 6 hours to 7 days. Laws don't change hourly; this cuts matsne fetch volume roughly 28x with no behavior change.

## Client changes (`chat-client.tsx` + `dictionaries.ts`)

- New sentinel `TECHNICAL_ERROR_MSG` constant mirroring the existing `NOT_FOUND_MSG` one (line 37), checked in both the JSON-response branch (line 76) and the streamed-response branch (line 119) — mapped to a new dictionary key `technicalError` instead of reusing `notFound`.
- `dictionaries.ts` gains `technicalError` in both `ka` and `en`:
  - ka: "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით."
  - en: "Technical difficulty connecting to the legal registry. Please try again later."

## Out of scope

- The existing uncommitted cheap→expensive model-tiering logic, model choices (`google/gemini-2.5-flash`, `openai/gpt-5.2`, `perplexity/sonar`), and `searchWebContext`'s unconditional practical-context call — already-decided work, left untouched.
- No embeddings, no vector store, no new API key/provider.
- No change to the `APPROVED_SOURCES` trust boundary beyond what's already decided (matsne.gov.ge only, still).
- No document-generation/review changes — chat (`/api/chat`) only.
- No admin-facing "force refresh sources" control.
- No audit/failed-query logging.

## Testing

No test runner configured. Verify manually:
- A question with a clean lexical hit still answers via the existing cheap-model path, unaffected.
- A question that triggers the existing cheap→expensive escalation (matches non-empty, cheap citation unverified) still escalates exactly as before — Tier 2 must NOT fire here.
- The originally-reported question (informal wording for a real law, zero lexical hits) now falls through to Tier 2 and returns a real, web-verified answer instead of `NOT_FOUND_MSG`.
- Temporarily break `OPENROUTER_API_KEY` or point an approved source URL at a 404 to simulate an infra failure — confirm the user sees the "technical difficulty" message, not `NOT_FOUND_MSG`, and `consultationsRemaining` is not decremented.
- Confirm the circuit breaker trips after 3 consecutive simulated fetch failures and short-circuits without further matsne/model calls, then resets after 2 minutes or on a success.
- `npm run lint` and `npx tsc --noEmit` clean.
