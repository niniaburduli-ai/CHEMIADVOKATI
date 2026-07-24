# AI Cost Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the real dollar cost of every OpenRouter call (via OpenRouter's `usage.cost` field) against the Consultation/GeneratedDocument/DocumentReview record it produced, and surface per-record cost plus a per-user "Total AI Cost" rollup in the admin panel.

**Architecture:** Every OpenRouter request body gains `usage: { include: true }`. Every function that talks to OpenRouter changes its return shape to also carry `costUsd` (non-streaming: `{ content, costUsd }`; streaming generators: `costUsd` as the generator's return value instead of `void`). Each API route sums the costs of every OpenRouter call it made for one request and stores that sum on the record it saves. The admin page aggregates those sums per user at read time (no denormalized total on `User` — avoids staleness).

**Tech Stack:** Next.js 16 API routes, Mongoose, TypeScript strict, no test runner (verify with `npx tsc --noEmit` and manual dev-server checks against the real OpenRouter API).

## Global Constraints

- No self-maintained pricing table — cost always comes from OpenRouter's own `usage.cost` (USD, 1:1 with OpenRouter credits).
- Fail-open: a missing/malformed `usage.cost` contributes `$0`, never throws (matches this codebase's existing fail-open pattern for web search / citation verification).
- Cost for a saved record = sum of **every** OpenRouter call spent producing it, not just the one whose text was shown (query expansion, discarded tier attempts, web-context search, web fallback, citation verification all count).
- No cost is tracked for requests that never save a record (e.g. `not_found`/`technical_error` chat outcomes) — there's no field to attach it to, and it's out of scope per the approved design.
- OCR (Tesseract.js) and file text extraction (pdf-parse/mammoth) are local, not OpenRouter calls — never contribute cost.

---

## File Structure

New file:
- `src/lib/openrouter-usage.ts` — one function, `extractCostUsd(json: unknown): number`, shared by every non-streaming OpenRouter call site (`legal/openrouter.ts`, `ai-call.ts`) to avoid duplicating the same 3-line parse three times.

Modified files (in dependency order — later files depend on the return-shape changes made in earlier ones):
1. `src/lib/openrouter-usage.ts` (new)
2. `src/lib/openrouter-stream-core.ts` — streaming usage capture
3. `src/lib/ai-call.ts` — non-streaming + streaming cost passthrough
4. `src/lib/legal/openrouter.ts` — `callOpenRouter`, `generateLegalAnswer`, `streamLegalAnswer`, `searchWebContext`, `answerViaWebSearch` (+ `runWebAnswerAttempt`), `verifyLegalCitations`
5. `src/lib/legal/query-understanding.ts` — `expandQuery`
6. `src/lib/models/consultation.ts`, `src/lib/models/generated-document.ts`, `src/lib/models/document-review.ts` — schema field
7. `src/app/api/chat/route.ts` — cost accumulation across the whole chat pipeline
8. `src/app/api/generate/route.ts` — cost accumulation for generation + citation verification
9. `src/app/api/review/route.ts` — cost for the analysis call
10. `src/app/api/review/improve/route.ts` — cost for the improve call, added onto the review
11. `src/app/admin/page.tsx` — per-user cost aggregation, cost fields on row types
12. `src/components/admin/admin-dashboard.tsx` — `formatCostUsd` helper + cost columns/fields

---

### Task 1: Shared usage-cost parser

**Files:**
- Create: `src/lib/openrouter-usage.ts`

**Interfaces:**
- Produces: `extractCostUsd(json: unknown): number` — used by every later task that parses a non-streaming OpenRouter JSON response.

- [ ] **Step 1: Write the file**

```ts
/** @module openrouter-usage
 *
 * OpenRouter's Usage Accounting feature: adding `usage: { include: true }` to
 * a chat-completions request body makes OpenRouter return the real dollar
 * cost it billed for that exact call, as `usage.cost` (USD — OpenRouter
 * credits are 1:1 with USD). Shared by every non-streaming call site so the
 * parsing isn't duplicated across files.
 */

/** Extract the billed cost (USD) from an OpenRouter response body. Returns 0
 * (never throws) if the field is missing — a fail-open default, since a
 * missing cost should never break the feature that triggered the call. */
export function extractCostUsd(json: unknown): number {
  const usage = (json as { usage?: { cost?: number } })?.usage;
  return typeof usage?.cost === "number" ? usage.cost : 0;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this file has no callers yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/openrouter-usage.ts
git commit -m "feat(cost): add shared OpenRouter usage-cost parser"
```

---

### Task 2: Streaming usage capture

**Files:**
- Modify: `src/lib/openrouter-stream-core.ts`

**Interfaces:**
- Consumes: `extractCostUsd` from Task 1.
- Produces: `openOpenRouterStream(...)` now resolves to `AsyncGenerator<string, number, unknown>` (return value = total cost of the stream, 0 if never seen). Every consumer of this generator across the codebase (Task 3, Task 4's `streamLegalAnswer`, and later the chat/generate routes) must switch from `for await (const x of gen)` to manual `gen.next()` iteration to observe that return value — `for await...of` silently discards a generator's return value.

- [ ] **Step 1: Add `usage: { include: true }` to the request body and parse the usage frame in `consumeSse`**

Replace the body construction in `openOpenRouterStream` (currently lines 64-72):

```ts
  const body = JSON.stringify({
    model: opts.model,
    messages,
    max_tokens: opts.maxTokens,
    stream: true,
    usage: { include: true },
    ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    ...(opts.frequencyPenalty != null ? { frequency_penalty: opts.frequencyPenalty } : {}),
    ...(opts.extraBody ?? {}),
  });
```

Replace the final `return consumeSse(res, opts.idleTimeoutMs ?? 45_000);` and the `consumeSse` function itself with:

```ts
  return consumeSse(res, opts.idleTimeoutMs ?? 45_000);
}

async function readAll(res: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of res) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

/** Parse OpenRouter's `data: {...}\n\n` SSE frames into content deltas.
 * Returns the total billed cost (USD) as the generator's return value — it
 * arrives on the final usage-bearing frame before `[DONE]` (see
 * openrouter-usage.ts). 0 if the stream never carried a usage frame. */
async function* consumeSse(
  res: IncomingMessage,
  idleTimeoutMs: number
): AsyncGenerator<string, number, unknown> {
  res.setTimeout(idleTimeoutMs, () => res.destroy(new Error("OpenRouter stream idle timeout")));

  let buffer = "";
  let costUsd = 0;
  try {
    for await (const raw of res) {
      buffer += (raw as Buffer).toString("utf8");
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let json: unknown;
          try {
            json = JSON.parse(data);
          } catch {
            continue;
          }
          const delta = (
            json as { choices?: Array<{ delta?: { content?: string } }> }
          )?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
          const cost = extractCostUsd(json);
          if (cost > 0) costUsd = cost;
        }
      }
    }
  } finally {
    res.destroy();
  }
  return costUsd;
}
```

Add the import at the top of the file:

```ts
import { extractCostUsd } from "./openrouter-usage";
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `ai-call.ts` and `legal/openrouter.ts` (their `for await...of` loops over this generator no longer see a `void` return type but the loops themselves still compile — TypeScript won't error here since `for await...of` is legal on any async generator regardless of return type). Expect **no** errors yet from this file alone; downstream call sites are fixed in Tasks 3-4.

- [ ] **Step 3: Commit**

```bash
git add src/lib/openrouter-stream-core.ts
git commit -m "feat(cost): capture OpenRouter usage cost from SSE streams"
```

---

### Task 3: `ai-call.ts` cost passthrough

**Files:**
- Modify: `src/lib/ai-call.ts`

**Interfaces:**
- Consumes: `extractCostUsd` (Task 1), `openOpenRouterStream` now returning `AsyncGenerator<string, number, unknown>` (Task 2).
- Produces: `callOpenRouterChat(...): Promise<{ content: string; costUsd: number }>` (was `Promise<string>`). `streamOpenRouterChat(...)` return type is unchanged in signature (`Promise<AsyncGenerator<string, void, unknown>>` → update to `Promise<AsyncGenerator<string, number, unknown>>`) — it's a thin passthrough to `openOpenRouterStream`, so this just widens its declared type to match. Consumed by Task 8 (`api/generate/route.ts`) and Task 9/10 (`api/review*`).

- [ ] **Step 1: Rewrite the file**

```ts
import { openOpenRouterStream } from "./openrouter-stream-core";
import { extractCostUsd } from "./openrouter-usage";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = () =>
  process.env.OPENROUTER_ANSWER_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "google/gemini-2.5-flash";

/**
 * Streaming counterpart to `callOpenRouterChat` — opens the upstream
 * connection and resolves once it's confirmed live (HTTP 200), so callers
 * can still fall back to a clean error response if the connection itself
 * fails. Rejects with `OpenRouterConnectError` in that case; once resolved,
 * the generator yields content deltas as they arrive and returns the total
 * billed cost (USD) once the stream ends.
 */
export async function streamOpenRouterChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  maxTokens = 2500
) {
  return openOpenRouterStream(messages, {
    model: model ?? MODEL(),
    maxTokens,
  });
}

export async function callOpenRouterChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  model?: string,
  maxTokens = 2500
): Promise<{ content: string; costUsd: number }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model ?? MODEL(),
      messages,
      max_tokens: maxTokens,
      usage: { include: true },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    costUsd: extractCostUsd(data),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `src/app/api/review/route.ts` and `src/app/api/review/improve/route.ts` (they still treat `callOpenRouterChat`'s result as a `string`) — expected, fixed in Tasks 9-10. No errors from this file itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai-call.ts
git commit -m "feat(cost): thread OpenRouter usage cost through ai-call helpers"
```

---

### Task 4: `legal/openrouter.ts` cost passthrough

**Files:**
- Modify: `src/lib/legal/openrouter.ts`

**Interfaces:**
- Consumes: `extractCostUsd` (Task 1), `openOpenRouterStream` (Task 2).
- Produces:
  - `callOpenRouter(...): Promise<{ content: string; costUsd: number }>` (was `Promise<string>`)
  - `generateLegalAnswer(...): Promise<{ text: string; costUsd: number }>` (was `Promise<string>`) — currently dead code (no callers), updated only to keep the file compiling.
  - `streamLegalAnswer(...)` return type widens to `Promise<AsyncGenerator<string, number, unknown>>` (thin passthrough, same as Task 3's `streamOpenRouterChat`).
  - `export type WebContext = { summary: string; sources: WebSource[]; costUsd: number }` (added field).
  - `searchWebContext(...): Promise<WebContext | null>` — unchanged signature, `costUsd` now populated inside the returned object.
  - `export type WebSearchResult = { answer: WebAnswer | null; costUsd: number }`
  - `answerViaWebSearch(...): Promise<WebSearchResult>` (was `Promise<WebAnswer | null>`) — **breaking change**, consumed by Task 7 (`api/chat/route.ts`, both `tryWebFallback` and the inner NOT_FOUND branch of `runChatStream`).
  - `verifyLegalCitations(...): Promise<{ text: string; costUsd: number } | null>` (was `Promise<string | null>`) — consumed by Task 8 (`api/generate/route.ts`).

- [ ] **Step 1: Import the shared parser**

Add near the top imports:

```ts
import { extractCostUsd } from "../openrouter-usage";
```

- [ ] **Step 2: `callOpenRouter`** — add `usage: { include: true }` to the body and return cost

Replace the `body` construction (currently around line 322-329):

```ts
  const body: Record<string, unknown> = {
    model: opts.model ?? ANSWER_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 500,
    usage: { include: true },
  };
```

Replace the function's return type and final lines (currently `Promise<string>` and the body ending in `return content.trim();`):

```ts
export async function callOpenRouter(
  messages: ChatMessage[],
  opts: CallOptions = {}
): Promise<{ content: string; costUsd: number }> {
```

... (keep the body identical up through the `res.ok` check) ...

```ts
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  return { content: content.trim(), costUsd: extractCostUsd(json) };
}
```

- [ ] **Step 3: `generateLegalAnswer`** — thread the new return shape through (dead code today, but must still compile)

```ts
export async function generateLegalAnswer(
  messages: ChatMessage[],
  tier: AnswerTier = "cheap"
): Promise<{ text: string; costUsd: number }> {
  const { content, costUsd } = await callOpenRouter(messages, {
    model: modelForTier(tier),
    temperature: 0,
    maxTokens: 1200,
    frequencyPenalty: 0.2,
  });
  return { text: content, costUsd };
}
```

- [ ] **Step 4: `streamLegalAnswer`** — no code change needed beyond the type flowing through from `openOpenRouterStream` (Task 2); confirm the function body is untouched (it already just returns `openOpenRouterStream(...)`).

- [ ] **Step 5: `WebContext` type + `searchWebContext`** — add `costUsd`

Change the type:

```ts
export type WebContext = { summary: string; sources: WebSource[]; costUsd: number };
```

In `searchWebContext`, after `const json = await res.json();`, capture cost and include it in the returned object:

```ts
    const json = await res.json();
    const msg = json?.choices?.[0]?.message;
    const summary: string = (msg?.content ?? "").trim();
    if (!summary) return null;

    return { summary, sources: extractWebSources(msg, 6), costUsd: extractCostUsd(json) };
```

- [ ] **Step 6: `runWebAnswerAttempt`** — report cost even when the attempt is discarded (no allowed-host source, empty prose)

Replace the function's return type and body from `const json = await res.json();` onward:

```ts
async function runWebAnswerAttempt(
  question: string,
  attempt: number,
  apiKey: string,
  keywords?: string[]
): Promise<{ answer: WebAnswer | null; costUsd: number }> {
```

... (keep the `model`/`body`/fetch setup identical) ...

```ts
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { answer: null, costUsd: 0 };

    const json = await res.json();
    const costUsd = extractCostUsd(json);
    const msg = json?.choices?.[0]?.message;
    const prose: string = (msg?.content ?? "").trim();
    if (!prose) return { answer: null, costUsd };

    const sources = extractWebSources(msg, 6).filter((s) => isAllowedHost(s.url));
    if (sources.length === 0) return { answer: null, costUsd };

    return { answer: { prose, sources }, costUsd };
  } catch {
    return { answer: null, costUsd: 0 };
  } finally {
    clearTimeout(timer);
  }
}
```

Also add `usage: { include: true }` to this function's `body` object (find the `const body: Record<string, unknown> = { model, temperature: ..., max_tokens: 900, messages: [...] };` block and add `usage: { include: true },` alongside the existing fields).

- [ ] **Step 7: `answerViaWebSearch`** — accumulate cost across attempts

```ts
export type WebSearchResult = { answer: WebAnswer | null; costUsd: number };

export async function answerViaWebSearch(
  question: string,
  keywords?: string[]
): Promise<WebSearchResult> {
  if (!WEB_SEARCH_ON()) return { answer: null, costUsd: 0 };
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { answer: null, costUsd: 0 };

  let best: WebAnswer | null = null;
  let costUsd = 0;
  for (let attempt = 0; attempt < WEB_ANSWER_MAX_ATTEMPTS; attempt++) {
    const result = await runWebAnswerAttempt(question, attempt, apiKey, keywords);
    costUsd += result.costUsd;
    if (!result.answer) continue;
    if (looksLikeRealAnswer(result.answer.prose)) return { answer: result.answer, costUsd };
    best = best ?? result.answer;
  }
  return { answer: best, costUsd };
}
```

- [ ] **Step 8: `verifyLegalCitations`** — add `usage: { include: true }` and return cost

Add `usage: { include: true },` to this function's `body` object. Change the return type and final lines:

```ts
export async function verifyLegalCitations(
  docTypeName: string,
  citationsSection: string
): Promise<{ text: string; costUsd: number } | null> {
```

... (keep the body identical through the fetch/res.ok check) ...

```ts
    const json = await res.json();
    const content: string = (json?.choices?.[0]?.message?.content ?? "").trim();
    return content ? { text: content, costUsd: extractCostUsd(json) } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors in `src/lib/legal/query-understanding.ts` (destructures `callOpenRouter`'s result as a bare string) and `src/app/api/chat/route.ts` / `src/app/api/generate/route.ts` (consume `answerViaWebSearch`/`verifyLegalCitations`/`streamLegalAnswer` with the old shapes) — expected, fixed in Tasks 5, 7, 8. No errors from this file itself.

- [ ] **Step 10: Commit**

```bash
git add src/lib/legal/openrouter.ts
git commit -m "feat(cost): thread OpenRouter usage cost through legal/openrouter helpers"
```

---

### Task 5: `expandQuery` cost

**Files:**
- Modify: `src/lib/legal/query-understanding.ts`

**Interfaces:**
- Consumes: `callOpenRouter(...): Promise<{ content: string; costUsd: number }>` (Task 4).
- Produces: `ExpandedQuery` gains `costUsd: number`. Consumed by Task 7 (`api/chat/route.ts`).

- [ ] **Step 1: Add `costUsd` to the type and every return path**

Change the type:

```ts
export type ExpandedQuery = {
  original: string;
  keywords: string[];
  hypothetical: string;
  sourceIds: string[];
  needsWebContext: boolean;
  costUsd: number;
};
```

In `expandQuery`, the `fallback` object gains `costUsd: 0`:

```ts
  const fallback: ExpandedQuery = {
    original,
    keywords: [],
    hypothetical: "",
    sourceIds: [],
    needsWebContext: true,
    costUsd: 0,
  };
```

Replace the retry loop's body (currently calls `callOpenRouter` and treats the result as a string):

```ts
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { content: raw, costUsd } = await callOpenRouter(messages, {
        model: FAST_MODEL,
        temperature: 0,
        maxTokens: 260,
        json: true,
        timeoutMs: 12_000,
      });
      const { keywords, hypothetical, sourceIds, needsWebContext } = parseExpansion(raw);
      if (keywords.length === 0 && !hypothetical && sourceIds.length === 0) {
        return { ...fallback, costUsd };
      }
      return { original, keywords, hypothetical, sourceIds, needsWebContext, costUsd };
    } catch {
      if (attempt === 0) continue;
    }
  }
  return fallback;
```

(Note: even a "nothing usable" response still spent money, so its `costUsd` is preserved via `{ ...fallback, costUsd }` rather than silently dropped.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `src/app/api/chat/route.ts` still shows errors from Task 4 (unrelated to this file) — none from `query-understanding.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/lib/legal/query-understanding.ts
git commit -m "feat(cost): track query-expansion call cost"
```

---

### Task 6: Schema fields

**Files:**
- Modify: `src/lib/models/consultation.ts`
- Modify: `src/lib/models/generated-document.ts`
- Modify: `src/lib/models/document-review.ts`

**Interfaces:**
- Produces: `costUsd: number` (default 0) on all three Mongoose documents. Consumed by Tasks 7-10 (`.create(...)` calls) and Task 11 (aggregation).

- [ ] **Step 1: `consultation.ts`** — add the field to `ConsultationSchema`, right after `modelTier`

```ts
    modelTier: {
      type: String,
      enum: ["free1", "free2", "cheap", "complex", "web", "cached"],
    },
    // Sum of every OpenRouter call's real billed cost (USD) spent producing
    // this consultation — query expansion, every tier attempt tried (even
    // discarded ones), web-context search, and any web-fallback attempts.
    // 0 for consultations saved before cost tracking existed.
    costUsd: { type: Number, default: 0 },
```

- [ ] **Step 2: `generated-document.ts`** — add the field right after `source`

```ts
    source: { type: String, enum: ["ai", "template"], default: "ai" },
    // Sum of the generation call's cost + the citation-verification call's
    // cost (0 when citations came from the doc-type cache). 0 for documents
    // saved before cost tracking existed.
    costUsd: { type: Number, default: 0 },
```

- [ ] **Step 3: `document-review.ts`** — add the field right after `creditsUsed` (root-level running total, not per-revision)

```ts
    creditsUsed: { type: Number, default: 1 },
    // Sum of the initial analysis call's cost plus every improve call's
    // cost (incremented, not replaced, each time /api/review/improve runs).
    // 0 for reviews saved before cost tracking existed.
    costUsd: { type: Number, default: 0 },
    revisions: { type: [DocumentRevisionSchema], default: [] },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from these three files (additive schema fields, `InferSchemaType` picks them up automatically).

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/consultation.ts src/lib/models/generated-document.ts src/lib/models/document-review.ts
git commit -m "feat(cost): add costUsd field to consultation/document/review models"
```

---

### Task 7: Chat route cost accumulation

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: `expandQuery` → `ExpandedQuery.costUsd` (Task 5), `searchWebContext` → `WebContext.costUsd` (Task 4), `answerViaWebSearch` → `WebSearchResult` (Task 4), `streamLegalAnswer` → `AsyncGenerator<string, number, unknown>` (Task 4), `Consultation` model's `costUsd` field (Task 6).
- Produces: every `Consultation.create(...)` call in this file now includes `costUsd`.

- [ ] **Step 1: `finalizeAnswer`** — accept and save cost

Add `costUsd` to the params type and destructure, then pass it into `Consultation.create`:

```ts
async function finalizeAnswer(params: {
  userId: string;
  isAdmin: boolean;
  quotaSplit: QuotaSplit | null;
  question: string;
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
  modelTier: ModelTier;
  costUsd: number;
}): Promise<Response> {
  const { userId, isAdmin, quotaSplit, question, answer, legalBasis, webSources, modelTier, costUsd } =
    params;
```

In the same function, update the `Consultation.create` call:

```ts
  const saveOps: Promise<unknown>[] = [
    Consultation.create({ userId, question, answer, sources, modelTier, costUsd }),
  ];
```

- [ ] **Step 2: `tryWebFallback`** — accept prior cost, add the web-search cost, pass total through

```ts
async function tryWebFallback(
  userId: string,
  isAdmin: boolean,
  quotaSplit: QuotaSplit | null,
  question: string,
  priorCostUsd: number,
  keywords?: string[]
): Promise<Response> {
  const web = await answerViaWebSearch(question, keywords);
  const costUsd = priorCostUsd + web.costUsd;
  const prose = web.answer?.prose.trim();
  if (web.answer && prose && prose !== NOT_FOUND_MSG) {
    await setCachedAnswer(question, { answer: prose, legalBasis: [], webSources: web.answer.sources });
    return finalizeAnswer({
      userId,
      isAdmin,
      quotaSplit,
      question,
      answer: prose,
      legalBasis: [],
      webSources: web.answer.sources,
      modelTier: "web",
      costUsd,
    });
  }
  return NextResponse.json(
    { answer: NOT_FOUND_MSG, legalBasis: [] },
    { status: 200 }
  );
}
```

- [ ] **Step 3: `streamAnswerAttempt`** — capture the underlying stream's returned cost

```ts
async function* streamAnswerAttempt(
  messages: ChatMessage[],
  tier: AnswerTier
): AsyncGenerator<string, { full: string; costUsd: number }, unknown> {
  const deltas = await streamLegalAnswer(messages, tier);
  const splitter = new DelimiterSplitter(CITATION_DELIM);
  let full = "";
  let r = await deltas.next();
  while (!r.done) {
    full += r.value;
    const safe = splitter.push(r.value);
    if (safe) yield safe;
    r = await deltas.next();
  }
  const costUsd = r.value ?? 0;
  const { prose } = splitter.finish();
  if (prose) yield prose;
  return { full, costUsd };
}
```

- [ ] **Step 4: `drainAttempt`** — propagate the `{ full, costUsd }` shape

```ts
async function* drainAttempt(
  messages: ChatMessage[],
  tier: AnswerTier,
  shownAny: { value: boolean }
): AsyncGenerator<ChatStreamEvent, { full: string; costUsd: number }, unknown> {
  const it = streamAnswerAttempt(messages, tier);
  try {
    let r = await it.next();
    while (!r.done) {
      yield { type: "chunk", text: r.value };
      shownAny.value = true;
      r = await it.next();
    }
    return r.value;
  } catch {
    if (shownAny.value) yield { type: "reset" };
    shownAny.value = false;
    return { full: "", costUsd: 0 };
  }
}
```

- [ ] **Step 5: `ChatOutcome`** — add `costUsd` to the "answer" variant

```ts
type ChatOutcome =
  | {
      kind: "answer";
      text: string;
      legalBasis: LegalBasisGroup[];
      webSources?: WebSource[];
      modelTier: ModelTier;
      costUsd: number;
    }
  | { kind: "not_found" }
  | { kind: "technical_error" };
```

- [ ] **Step 6: `runChatStream`** — accumulate cost across tier attempts and the inner web fallback

At the top of the function (after `let servedTier: AnswerTier | null = null;`), add:

```ts
  let tierCostUsd = 0;
```

Inside the `for` loop, replace:

```ts
    const full = yield* drainAttempt(messages, tier, shownAny);
    ({ prose, citations } = parseAnswer(full));
```

with:

```ts
    const { full, costUsd: attemptCost } = yield* drainAttempt(messages, tier, shownAny);
    tierCostUsd += attemptCost;
    ({ prose, citations } = parseAnswer(full));
```

Replace the NOT_FOUND_MSG branch (currently calls `answerViaWebSearch(question, keywords)` and treats the result as `WebAnswer | null`):

```ts
  const answer = prose || NOT_FOUND_MSG;
  if (answer.trim() === NOT_FOUND_MSG) {
    if (shownAny.value) yield { type: "reset" };
    const web = await answerViaWebSearch(question, keywords);
    tierCostUsd += web.costUsd;
    const webProse = web.answer?.prose.trim();
    if (web.answer && webProse && webProse !== NOT_FOUND_MSG) {
      yield { type: "chunk", text: webProse };
      return {
        kind: "answer",
        text: webProse,
        legalBasis: [],
        webSources: web.answer.sources,
        modelTier: "web",
        costUsd: tierCostUsd,
      };
    }
    return { kind: "not_found" };
  }

  const legalBasis = buildLegalBasis(matches, citations);
  return {
    kind: "answer",
    text: answer,
    legalBasis,
    webSources: webContext?.sources,
    modelTier: servedTier ?? "cheap",
    costUsd: tierCostUsd,
  };
}
```

- [ ] **Step 7: `POST` handler** — thread `expandQuery`'s cost through both early-exit `tryWebFallback` calls, and combine `web`-context cost with `runChatStream`'s returned cost before saving

Replace:

```ts
  const expanded = await expandQuery(question);
```

Keep as-is — `expanded.costUsd` is now available. Update the two `tryWebFallback` call sites to pass it:

```ts
  if (fetched.length === 0) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.costUsd, expanded.keywords);
  }
```

```ts
  if (matches.length === 0) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.costUsd, expanded.keywords);
  }
```

Replace the `web` fetch line:

```ts
  const web = expanded.needsWebContext ? await searchWebContext(question) : null;
```

Keep as-is — `web?.costUsd` is now available. Update the final `Consultation.create` block inside the `bodyStream`'s `start`:

```ts
      const saveOps: Promise<unknown>[] = [
        Consultation.create({
          userId: session.user.id,
          question,
          answer: outcome.text,
          sources,
          modelTier: outcome.modelTier,
          costUsd: expanded.costUsd + (web?.costUsd ?? 0) + outcome.costUsd,
        }),
      ];
```

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file. (`src/app/api/generate/route.ts` may still show errors from Task 4's `verifyLegalCitations`/`streamOpenRouterChat` shape changes — fixed in Task 8.)

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, log in, ask a question on `/chat`. Then check MongoDB for the new `Consultation` document (e.g. via the admin DB panel at `/admin` → Database → `consultations`, or `mongosh`) and confirm `costUsd` is a small positive number (not 0, not missing) for a fresh, non-cached answer, and exactly `0` for a repeat question that hits the answer cache.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(cost): accumulate and save real OpenRouter cost per consultation"
```

---

### Task 8: Generate route cost accumulation

**Files:**
- Modify: `src/app/api/generate/route.ts`

**Interfaces:**
- Consumes: `streamOpenRouterChat` → `AsyncGenerator<string, number, unknown>` (Task 3), `verifyLegalCitations` → `{ text, costUsd } | null` (Task 4), `GeneratedDocument` model's `costUsd` field (Task 6).
- Produces: `GeneratedDocument.create(...)` now includes `costUsd`.

- [ ] **Step 1: Capture the generation stream's cost**

Replace the `bodyStream`'s `start` handler body from `const splitter = new DelimiterSplitter(CITATIONS_DELIM);` through the citation-verification block. Full replacement:

```ts
      const splitter = new DelimiterSplitter(CITATIONS_DELIM);
      let full = "";
      let midStreamError = false;
      let generationCostUsd = 0;
      try {
        let r = await deltas.next();
        while (!r.done) {
          full += r.value;
          const safe = splitter.push(r.value);
          if (safe) controller.enqueue(encoder.encode(safe));
          r = await deltas.next();
        }
        generationCostUsd = r.value ?? 0;
        const { prose } = splitter.finish();
        if (prose) controller.enqueue(encoder.encode(prose));
      } catch {
        midStreamError = true;
      }

      if (midStreamError || !full.trim()) {
        controller.enqueue(
          encoder.encode(encodeMeta({ error: "AI service unavailable" }))
        );
        controller.close();
        return;
      }

      const delimIndex = full.indexOf(CITATIONS_DELIM);
      const body_ = (delimIndex === -1 ? full : full.slice(0, delimIndex)).trim();
      const content = body_.replace(/^#{1,6}\s*/gm, "");
      const citationsSection =
        delimIndex === -1 ? "" : full.slice(delimIndex + CITATIONS_DELIM.length).trim();

      let legalBasis = citationsSection;
      let citationsCostUsd = 0;
      const cachedCitations = await getCachedCitations(parsed.data.type, locale);
      if (cachedCitations) {
        legalBasis = cachedCitations;
      } else if (citationsSection) {
        const verified = await verifyLegalCitations(typeName, citationsSection);
        if (verified) {
          legalBasis = verified.text;
          citationsCostUsd = verified.costUsd;
          await setCachedCitations(parsed.data.type, verified.text, locale);
        }
      }

      const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

      const docCreate = GeneratedDocument.create({
        userId: session.user.id,
        title,
        type: parsed.data.type,
        content,
        legalBasis,
        costUsd: generationCostUsd + citationsCostUsd,
      });
```

(Everything after `const docCreate = ...` — the `saveOps`/`Promise.all`/`controller.enqueue` at the end — is unchanged.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file. (`src/app/api/review/route.ts` and `src/app/api/review/improve/route.ts` still show errors from Task 3 — fixed in Tasks 9-10.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, log in, generate a document on `/generate`. Check the new `GeneratedDocument` row (via `/admin` → Database → `generateddocuments`) has a positive `costUsd`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat(cost): accumulate and save real OpenRouter cost per generated document"
```

---

### Task 9: Review route cost

**Files:**
- Modify: `src/app/api/review/route.ts`

**Interfaces:**
- Consumes: `callOpenRouterChat` → `{ content, costUsd }` (Task 3), `DocumentReview` model's `costUsd` field (Task 6).
- Produces: `DocumentReview.create(...)` now includes `costUsd`.

- [ ] **Step 1: Update the call site and the create call**

Replace:

```ts
  let raw: string;
  try {
    raw = await callOpenRouterChat(
      [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: `გაანალიზე ეს დოკუმენტი:\n\n${text}` },
      ],
      undefined,
      6000
    );
  } catch (err) {
```

with:

```ts
  let raw: string;
  let costUsd = 0;
  try {
    const result = await callOpenRouterChat(
      [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: `გაანალიზე ეს დოკუმენტი:\n\n${text}` },
      ],
      undefined,
      6000
    );
    raw = result.content;
    costUsd = result.costUsd;
  } catch (err) {
```

Add `costUsd` to the `DocumentReview.create` call:

```ts
  const review = await DocumentReview.create({
    userId: session.user.id,
    fileName,
    summary: analysis.summary,
    findings: analysis.findings,
    recommendations: analysis.recommendations,
    sourceText: text,
    pages,
    creditsUsed,
    costUsd,
  });
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from this file. (`review/improve/route.ts` still shows an error from Task 3 — fixed in Task 10.)

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, submit a document on `/review` (paste text is easiest). Check the new `DocumentReview` row has a positive `costUsd`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/review/route.ts
git commit -m "feat(cost): save real OpenRouter cost per document review"
```

---

### Task 10: Review/improve route cost

**Files:**
- Modify: `src/app/api/review/improve/route.ts`

**Interfaces:**
- Consumes: `callOpenRouterChat` → `{ content, costUsd }` (Task 3), `DocumentReview.costUsd` (Task 6, already present on the document from Task 9 or defaulted to 0 for older reviews).
- Produces: `review.costUsd` incremented (not replaced) by the improve call's cost, before `review.save()`.

- [ ] **Step 1: Update the call site**

Replace:

```ts
  let raw: string;
  try {
    raw = await callOpenRouterChat(
      [
        { role: "system", content: IMPROVEMENT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      undefined,
      16000
    );
  } catch (err) {
```

with:

```ts
  let raw: string;
  let costUsd = 0;
  try {
    const result = await callOpenRouterChat(
      [
        { role: "system", content: IMPROVEMENT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      undefined,
      16000
    );
    raw = result.content;
    costUsd = result.costUsd;
  } catch (err) {
```

- [ ] **Step 2: Add the cost onto the review before saving**

Replace:

```ts
  const diff = computeWordDiff(baseText, improvement.text);
  review.revisions.push(revision);
  await review.save();
```

with:

```ts
  const diff = computeWordDiff(baseText, improvement.text);
  review.revisions.push(revision);
  review.costUsd = (review.costUsd ?? 0) + costUsd;
  await review.save();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: **zero errors project-wide** — this was the last call site consuming a changed return shape.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, review a document then click improve on `/review`. Check the same `DocumentReview` row's `costUsd` increased from its post-review value.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/review/improve/route.ts
git commit -m "feat(cost): accumulate real OpenRouter cost on document improve"
```

---

### Task 11: Admin page cost aggregation

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `Consultation`, `GeneratedDocument`, `DocumentReview` models (all now have `costUsd`, Task 6).
- Produces: `ConsultationRow`, `GeneratedDocRow`, `ReviewRow` (imported from `admin-dashboard.tsx`, extended in Task 12) each gain `costUsd: number`. `UserRow` gains `totalAiCostUsd: number`, computed by summing that user's `Consultation`/`GeneratedDocument`/`DocumentReview` costs via one aggregation per collection.

- [ ] **Step 1: Add the three aggregation queries**

Add this type near the top of the file (after the existing imports):

```ts
type CostBucket = { _id: string; total: number };
```

Add three aggregations to the existing `Promise.all([...])` — insert them as new array entries (order doesn't matter, but keep them together for readability) and destructure accordingly:

```ts
  const [
    uploads,
    users,
    consultations,
    generatedDocs,
    reviews,
    feedback,
    consultationCosts,
    docCosts,
    reviewCosts,
  ] = await Promise.all([
    Upload.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(500).lean(),
    Consultation.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    GeneratedDocument.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    DocumentReview.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    Feedback.find().sort({ createdAt: -1 }).limit(500).lean(),
    Consultation.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
    GeneratedDocument.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
    DocumentReview.aggregate<CostBucket>([
      { $group: { _id: "$userId", total: { $sum: "$costUsd" } } },
    ]),
  ]);
```

- [ ] **Step 2: Merge the per-user totals into `userRows`**

Add this right before the `const userRows: UserRow[] = ...` line:

```ts
  const costByUser = new Map<string, number>();
  for (const bucket of [...consultationCosts, ...docCosts, ...reviewCosts]) {
    const key = String(bucket._id);
    costByUser.set(key, (costByUser.get(key) ?? 0) + bucket.total);
  }
```

Update the `userRows` mapping to include the new field:

```ts
  const userRows: UserRow[] = users.map((u) => ({
    id: String((u as { _id: unknown })._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: (u.role ?? "user") as "user" | "admin",
    plan: (u.plan ?? "free") as string,
    consultationsRemaining: u.consultationsRemaining ?? 0,
    docGenerationRemaining: u.docGenerationRemaining ?? 0,
    docReviewRemaining: u.docReviewRemaining ?? 0,
    docTemplatesRemaining: u.docTemplatesRemaining ?? 0,
    planExpiresAt: u.planExpiresAt ? new Date(u.planExpiresAt).toISOString() : null,
    createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    totalAiCostUsd: costByUser.get(String((u as { _id: unknown })._id)) ?? 0,
  }));
```

- [ ] **Step 3: Add `costUsd` to `consultationRows`, `generatedDocRows`, `reviewRows`**

In the `consultationRows` map, add `costUsd: (c as { costUsd?: number }).costUsd ?? 0,` next to `modelTier`.

In the `generatedDocRows` map, add `costUsd: (d as { costUsd?: number }).costUsd ?? 0,` next to `type`.

In the `reviewRows` map, add `costUsd: (r as { costUsd?: number }).costUsd ?? 0,` next to `creditsUsed`-equivalent fields (there's no `creditsUsed` shown today — just add it next to `recommendationsCount`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors from `src/components/admin/admin-dashboard.tsx` — the `UserRow`/`ConsultationRow`/`GeneratedDocRow`/`ReviewRow` types there don't have these new fields yet. Fixed in Task 12.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(cost): aggregate per-user AI cost and per-record cost for the admin page"
```

---

### Task 12: Admin dashboard UI

**Files:**
- Modify: `src/components/admin/admin-dashboard.tsx`

**Interfaces:**
- Consumes: `costUsd`/`totalAiCostUsd` fields produced by Task 11.
- Produces: `formatCostUsd(costUsd: number): string` helper; new "Cost" columns on `ConsultationsTable`, `GeneratedDocsTable`, `ReviewsTable`; new "AI Cost" column on `UsersTable`; a read-only cost line in `EditUserDialog`.

- [ ] **Step 1: Add `costUsd`/`totalAiCostUsd` to the row types**

Add to `UserRow` (after `planExpiresAt`):

```ts
export type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  plan: string;
  consultationsRemaining: number;
  docGenerationRemaining: number;
  docReviewRemaining: number;
  docTemplatesRemaining?: number;
  planExpiresAt?: string | null;
  createdAt: string | null;
  totalAiCostUsd: number;
};
```

Add to `ConsultationRow` (after `modelTier`):

```ts
export type ConsultationRow = {
  id: string;
  question: string;
  answer: string;
  modelTier: string | null;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};
```

Add to `GeneratedDocRow` (after `type`):

```ts
export type GeneratedDocRow = {
  id: string;
  title: string;
  type: string;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};
```

Add to `ReviewRow` (after `recommendationsCount`):

```ts
export type ReviewRow = {
  id: string;
  fileName: string;
  summary: string;
  findingsCount: number;
  recommendationsCount: number;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};
```

- [ ] **Step 2: Add the `formatCostUsd` helper**

Add right after `formatModelTier`:

```ts
/** USD → cents, formatted with enough decimals to stay visible for cheap
 * calls (e.g. "0.0231¢"). "—" for untracked/zero-cost records (cache hits,
 * pre-tracking rows). */
function formatCostUsd(costUsd: number): string {
  if (!costUsd || costUsd <= 0) return "—";
  const cents = costUsd * 100;
  return `${cents < 0.01 ? cents.toFixed(4) : cents.toFixed(2)}¢`;
}
```

- [ ] **Step 3: `ConsultationsTable`** — add the column

In the `<thead>`, add a new `<th>` after `<th>მოდელი</th>`:

```tsx
            <th>მოდელი</th>
            <th>ღირებულება</th>
```

Update `colSpan={5}` → `colSpan={6}` on the empty-state row.

In the row `<tr>`, add a new `<td>` after the model-tier `<td>`:

```tsx
                <td className="text-muted-foreground">{formatCostUsd(c.costUsd)}</td>
```

Update the expanded-row's `colSpan={5}` → `colSpan={6}`.

- [ ] **Step 4: `GeneratedDocsTable`** — add the column

In the `<thead>`, add after `<th>ტიპი</th>`:

```tsx
            <th>ტიპი</th>
            <th>ღირებულება</th>
```

Update `colSpan={4}` → `colSpan={5}`.

In the row `<tr>`, add after the type `<td>`:

```tsx
              <td className="text-muted-foreground">{formatCostUsd(d.costUsd)}</td>
```

- [ ] **Step 5: `ReviewsTable`** — add the column

In the `<thead>`, add after `<th>რეკ.</th>`:

```tsx
            <th>რეკ.</th>
            <th>ღირებულება</th>
```

Update `colSpan={6}` → `colSpan={7}` (both the empty-state row and the expanded-row).

In the row `<tr>`, add after the recommendations-count `<td>`:

```tsx
                <td className="text-muted-foreground">{formatCostUsd(r.costUsd)}</td>
```

- [ ] **Step 6: `UsersTable`** — add the column

In the `<thead>`, add after `<th>მიმ.</th>`:

```tsx
            <th>მიმ.</th>
            <th>AI ხარჯი</th>
```

Update `colSpan={9}` → `colSpan={10}`.

In the row `<tr>`, add after the `docReviewRemaining` `<td>`:

```tsx
              <td className="text-muted-foreground">{formatCostUsd(u.totalAiCostUsd)}</td>
```

- [ ] **Step 7: `EditUserDialog`** — read-only cost line

In the dialog body, add a line right after the `DialogDescription` (which shows `user?.email`):

```tsx
        <DialogHeader>
          <DialogTitle>მომხმარებლის რედაქტირება</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        {user && (
          <p className="text-xs text-muted-foreground">
            სულ AI ხარჯი: <span className="font-medium text-foreground">{formatCostUsd(user.totalAiCostUsd)}</span>
          </p>
        )}
```

(`user` here is the `EditUserDialog` component's own `user: UserRow | null` prop — already in scope.)

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: **zero errors project-wide.**

- [ ] **Step 9: Lint**

Run: `npm run lint`
Expected: no new warnings/errors.

- [ ] **Step 10: Manual verification**

Run: `npm run dev`, open `/admin`, check:
- Consultations tab shows a "ღირებულება" column with non-"—" values for consultations created during this session's testing.
- Documents/Reviews tabs show the same.
- Users tab shows an "AI ხარჯი" column; opening a user's edit dialog (pencil icon) shows the same total.

- [ ] **Step 11: Commit**

```bash
git add src/components/admin/admin-dashboard.tsx
git commit -m "feat(cost): show consultation/document/review cost and per-user AI cost total in admin panel"
```

---

## Self-Review Notes

- **Spec coverage:** Consultation Cost (Task 12 Step 3) ✓, Total AI Cost per user summing consultations + documents + reviews (Task 11 + Task 12 Steps 6-7) ✓, OpenRouter-native cost source (Task 1) ✓, all-calls scope (Tasks 4, 5, 7) ✓, fail-open on missing cost (Task 1's `extractCostUsd` default, Task 4's `catch` blocks) ✓.
- **Type consistency:** `costUsd`/`content`/`text` naming kept consistent with each function's existing convention (`callOpenRouter` already used `content`; `generateLegalAnswer` already used `text`) rather than forcing one name everywhere — matches existing code, avoids an unrelated rename.
- **Known accepted gap (by design, not a bug):** cost spent producing a chat `not_found`/`technical_error` outcome (no `Consultation` ever saved) is not persisted anywhere — there's no record to attach it to, and it was explicitly out of scope in the approved design.
