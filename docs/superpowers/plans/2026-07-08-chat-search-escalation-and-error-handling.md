# Chat Search Escalation & Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix chat consultation answers wrongly saying "not found" when the law does cover the question (lexical search missed it), and stop conflating infrastructure failures with genuine "law doesn't address this."

**Architecture:** Remove the hard `matches.length === 0` early-return in `/api/chat`; when the existing cheap→expensive model retry (already in the codebase, uncommitted) still can't ground an answer AND no local text was ever retrieved, fall back to a new web-search-verified path restricted to matsne.gov.ge. Separately, split every infra-failure branch (matsne unreachable, both draft model calls throwing) into a distinct `TECHNICAL_ERROR_MSG`, add a retry + circuit breaker around the matsne fetch batch, and lengthen the fetch cache TTL.

**Tech Stack:** Next.js 16 App Router API route, TypeScript, OpenRouter (existing `openrouter.ts` client), no test runner (verify via `npm run lint`, `npx tsc --noEmit`, manual dev-server checks).

## Global Constraints

- Never fetch or trust legal text from any host except `matsne.gov.ge` / `www.matsne.gov.ge` (existing hard rule, `sources.ts`).
- Consultation quota (`consultationsRemaining`) must never be decremented on `NOT_FOUND_MSG` or `TECHNICAL_ERROR_MSG` — only after a full successful answer.
- Do not modify the existing uncommitted cheap→expensive model-tiering logic (`hasVerifiedCitation`, `ANSWER_MODEL` / `ANSWER_MODEL_COMPLEX` split) — build after/around it, not replacing it.
- No new API keys, no new persistent storage, no test framework installation — this project has none configured (per `CLAUDE.md`).
- `TECHNICAL_ERROR_MSG` (ka): `ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.`

---

### Task 1: Technical-error message — constant, dictionary, client wiring

**Files:**
- Modify: `src/lib/legal/openrouter.ts:41-42`
- Modify: `src/lib/i18n/dictionaries.ts` (ka block ~line 121, en block ~line 454)
- Modify: `src/app/chat/chat-client.tsx:36-37`, `:73-83`, `:119-125`

**Interfaces:**
- Produces: `TECHNICAL_ERROR_MSG: string` exported from `src/lib/legal/openrouter.ts`, used by Task 6.
- Produces: `d.chat.technicalError: string` dictionary key, used by `chat-client.tsx`.

- [ ] **Step 1: Add the constant in `openrouter.ts`**

Right after the existing `NOT_FOUND_MSG` export (line 41-42):

```ts
export const NOT_FOUND_MSG =
  "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

/**
 * Distinct from NOT_FOUND_MSG: shown when the pipeline itself failed
 * (matsne unreachable, both draft model attempts errored) rather than when
 * it ran cleanly and found nothing. Never counts against consultation quota
 * (the route returns before the decrement code in either case).
 */
export const TECHNICAL_ERROR_MSG =
  "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.";
```

- [ ] **Step 2: Add the dictionary key in both locales**

In `src/lib/i18n/dictionaries.ts`, find the `ka` object's chat section (it has `notFound`, `errorGeneric`, `errorNoBody`, `errorNetwork` around line 121-124) and add:

```ts
    notFound: "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.",
    technicalError:
      "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.",
    errorGeneric: "შეცდომა.",
```

Find the matching `en` object (around line 454-457) and add:

```ts
    notFound: "Answer not found in the approved legal sources.",
    technicalError: "Technical difficulty connecting to the legal registry. Please try again later.",
    errorGeneric: "Error.",
```

- [ ] **Step 3: Wire the sentinel into `chat-client.tsx`**

Replace line 36-37:

```ts
// Keep in sync with NOT_FOUND_MSG in src/lib/legal/openrouter.ts.
const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";
```

with:

```ts
// Keep in sync with NOT_FOUND_MSG in src/lib/legal/openrouter.ts.
const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";
// Keep in sync with TECHNICAL_ERROR_MSG in src/lib/legal/openrouter.ts.
const TECHNICAL_ERROR_MSG =
  "ტექნიკური შეფერხება იურიდიულ რეესტრთან დაკავშირებისას — გთხოვთ სცადოთ მოგვიანებით.";
```

Replace the JSON-response branch (line 73-83):

```ts
      if (ct.includes("application/json")) {
        const data = await res.json();
        const rawContent = data.answer ?? data.error ?? d.chat.errorGeneric;
        const content = rawContent.trim() === NOT_FOUND_MSG ? d.chat.notFound : rawContent;
        patch((msg) => ({
          ...msg,
          content,
          legalBasis: rawContent.trim() === NOT_FOUND_MSG ? [] : data.legalBasis ?? [],
        }));
        return;
      }
```

with:

```ts
      if (ct.includes("application/json")) {
        const data = await res.json();
        const rawContent = data.answer ?? data.error ?? d.chat.errorGeneric;
        const trimmed = rawContent.trim();
        const isTerminal = trimmed === NOT_FOUND_MSG || trimmed === TECHNICAL_ERROR_MSG;
        const content =
          trimmed === NOT_FOUND_MSG
            ? d.chat.notFound
            : trimmed === TECHNICAL_ERROR_MSG
              ? d.chat.technicalError
              : rawContent;
        patch((msg) => ({
          ...msg,
          content,
          legalBasis: isTerminal ? [] : data.legalBasis ?? [],
        }));
        return;
      }
```

Replace the streamed-response tail (line 119-125):

```ts
      const isNotFound = acc.trim() === NOT_FOUND_MSG;
      patch((msg) => ({
        ...msg,
        content: isNotFound ? d.chat.notFound : acc,
        legalBasis: isNotFound ? [] : legalBasis,
        webSources: isNotFound ? [] : webSources,
      }));
```

with:

```ts
      const trimmedAcc = acc.trim();
      const isNotFound = trimmedAcc === NOT_FOUND_MSG;
      const isTechnicalError = trimmedAcc === TECHNICAL_ERROR_MSG;
      const isTerminal = isNotFound || isTechnicalError;
      patch((msg) => ({
        ...msg,
        content: isNotFound ? d.chat.notFound : isTechnicalError ? d.chat.technicalError : acc,
        legalBasis: isTerminal ? [] : legalBasis,
        webSources: isTerminal ? [] : webSources,
      }));
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: both clean (no errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/legal/openrouter.ts src/lib/i18n/dictionaries.ts src/app/chat/chat-client.tsx
git commit -m "feat: add distinct technical-error message for chat pipeline failures"
```

---

### Task 2: Lengthen fetch cache TTL

**Files:**
- Modify: `src/lib/legal/fetch-source.ts:19`

**Interfaces:** none (internal constant only).

- [ ] **Step 1: Change the TTL**

Replace:

```ts
const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
```

with:

```ts
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — law text changes rarely; avoid hammering matsne
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/legal/fetch-source.ts
git commit -m "fix: lengthen matsne fetch cache TTL from 6h to 7d"
```

---

### Task 3: Fetch circuit breaker + batch retry

**Files:**
- Create: `src/lib/legal/fetch-circuit.ts`
- Modify: `src/app/api/chat/route.ts` (fetch block, currently lines 71-83)

**Interfaces:**
- Produces (from `fetch-circuit.ts`): `isCircuitOpen(): boolean`, `recordFetchSuccess(): void`, `recordFetchFailure(): void`.
- Consumes (in `route.ts`): `TECHNICAL_ERROR_MSG` from Task 1, `fetchApprovedSource` (existing).

- [ ] **Step 1: Create the circuit breaker module**

```ts
// src/lib/legal/fetch-circuit.ts
/**
 * Circuit breaker for the matsne fetch batch in the chat route. After
 * several consecutive full-batch failures (matsne WAF blocking us, an
 * outage, etc.) we stop hammering it and fail fast for a cool-down window —
 * saves both matsne load and the model calls that would otherwise run on a
 * request already doomed to fail. Resets on any success.
 */

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

type CircuitState = { consecutiveFailures: number; openUntil: number };

declare global {
  var __matsneFetchCircuit: CircuitState | undefined;
}
const state: CircuitState =
  globalThis.__matsneFetchCircuit ??
  (globalThis.__matsneFetchCircuit = { consecutiveFailures: 0, openUntil: 0 });

/** True if the breaker is open — caller should skip fetching and fail fast. */
export function isCircuitOpen(): boolean {
  return state.openUntil > Date.now();
}

/** Call after a fetch batch returns at least one source. */
export function recordFetchSuccess(): void {
  state.consecutiveFailures = 0;
  state.openUntil = 0;
}

/** Call after a fetch batch returns zero sources. */
export function recordFetchFailure(): void {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + COOLDOWN_MS;
  }
}
```

- [ ] **Step 2: Wire it into `route.ts`, with a batch retry**

Add to the import block at the top of `src/app/api/chat/route.ts`:

```ts
import { isCircuitOpen, recordFetchFailure, recordFetchSuccess } from "@/lib/legal/fetch-circuit";
import { TECHNICAL_ERROR_MSG } from "@/lib/legal/openrouter";
```

(add `TECHNICAL_ERROR_MSG` to the existing `import { ... } from "@/lib/legal/openrouter"` block instead of a second import line)

Replace the current fetch block:

```ts
  const fetchedRaw = await Promise.all(
    selected.map((s) => fetchApprovedSource(s.url, s.title))
  );
  const fetched = fetchedRaw.filter(
    (s): s is NonNullable<typeof s> => s !== null
  );

  if (fetched.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }
```

with:

```ts
  if (isCircuitOpen()) {
    return NextResponse.json(
      { answer: TECHNICAL_ERROR_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  const fetchBatch = () =>
    Promise.all(selected.map((s) => fetchApprovedSource(s.url, s.title)));

  let fetchedRaw = await fetchBatch();
  let fetched = fetchedRaw.filter((s): s is NonNullable<typeof s> => s !== null);

  if (fetched.length === 0) {
    // One retry — matsne's WAF is intermittently flaky (fetch-source.ts).
    await new Promise((r) => setTimeout(r, 800));
    fetchedRaw = await fetchBatch();
    fetched = fetchedRaw.filter((s): s is NonNullable<typeof s> => s !== null);
  }

  if (fetched.length === 0) {
    recordFetchFailure();
    return NextResponse.json(
      { answer: TECHNICAL_ERROR_MSG, legalBasis: [] },
      { status: 200 }
    );
  }
  recordFetchSuccess();
```

- [ ] **Step 3: Verify — normal path unaffected**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean.

Start dev server (`npm run dev`), sign in, ask a question you know the app currently answers correctly (e.g. an existing working consultation question). Confirm it still answers normally with legal basis shown — the retry/breaker must not change behavior on the happy path.

- [ ] **Step 4: Verify — circuit breaker actually trips**

Temporarily edit `src/lib/legal/sources.ts`, change one `APPROVED_SOURCES` entry's `url` to an invalid path under the same host, e.g. `"https://matsne.gov.ge/ka/document/view/999999999"` (still matsne.gov.ge, so `isAllowedHost` still passes, but the document doesn't exist → `looksLikeLaw` fails → `fetchApprovedSource` returns `null`). Ask 3 questions in a row that route to that source (or set `expanded.sourceIds` fallback by asking something ambiguous so all 8 are tried — at least one always fails now). After the 3rd failure, ask a 4th question immediately: confirm the response comes back fast (no matsne network wait) and shows the technical-error text. Revert the URL edit in `sources.ts` afterward — do not commit the broken URL.

- [ ] **Step 5: Commit**

```bash
git add src/lib/legal/fetch-circuit.ts src/app/api/chat/route.ts
git commit -m "feat: add retry + circuit breaker around matsne fetch batch"
```

---

### Task 4: Stop hard-failing on a lexical search miss

**Files:**
- Modify: `src/app/api/chat/route.ts` (currently lines 90-96)

**Interfaces:** none new — `matches` (type `ScoredChunk[]`, from `searchSources`) simply may now be `[]` going forward into the rest of the function.

- [ ] **Step 1: Remove the early return**

Replace:

```ts
  const matches = searchSources(fetched, searchQuery, 10);
  if (matches.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }
```

with:

```ts
  const matches = searchSources(fetched, searchQuery, 10);
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean (rest of the function already handles an empty `matches` array: `buildGroundedPrompt` accepts an empty `sources` array, `hasVerifiedCitation` returns `false` on empty input, `buildLegalBasis` returns `[]`).

Manually ask a question you'd expect to have zero lexical hits (nonsense or totally unrelated to any of the 8 laws, e.g. "explain photosynthesis"). Confirm the app still ends up showing "not found" (expected — no fallback wired yet, that's Task 6) rather than erroring.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix: don't hard-fail chat answers on a zero-hit lexical search"
```

---

### Task 5: Web-verified fallback for a true retrieval miss

**Files:**
- Modify: `src/lib/legal/openrouter.ts` (add after `verifyLegalCitations`, before `streamText`)

**Interfaces:**
- Consumes: `WEB_SEARCH_ON()`, `WEB_MODEL()`, `WEB_MAX_RESULTS()`, `hasNativeWebAccess()`, `OPENROUTER_URL`, `CITATION_DELIM`, `NOT_FOUND_MSG` (all already defined earlier in this file).
- Produces: `export type ChatFallbackResult = { prose: string; article?: string; lawName?: string; url?: string }` and `export async function verifyChatAnswer(question: string): Promise<ChatFallbackResult | null>`, used by Task 6.

- [ ] **Step 1: Add the system prompt and function**

Insert after the closing brace of `verifyLegalCitations` (right before the `/** Wrap already-generated text ... */ streamText` comment):

```ts
const CHAT_FALLBACK_SYSTEM = [
  "შენ ხარ ქართული სამართლის ასისტენტი „ჩემი იურისტი\".",
  "მოცემულ შეკითხვაზე ვერ მოიძებნა შესაბამისი მუხლი ჩვენს ლოკალურ კანონთა ბაზაში.",
  "შენი ამოცანაა: ვებ ძიებით — მხოლოდ matsne.gov.ge საიტზე — მოძებნო რეალური, მოქმედი ქართული კანონის კონკრეტული მუხლი, რომელიც ამ შეკითხვას პასუხობს.",
  "თუ ასეთი მუხლი ნამდვილად იპოვე და დაადასტურე matsne.gov.ge-ზე — უპასუხე მარტივი, გასაგები ენით, საკუთარი სიტყვებით (არასოდეს კოპირო ტექსტი სიტყვასიტყვით), და ბოლოს დაწერე ცალკე სტრიქონზე ზუსტად:",
  CITATION_DELIM,
  "შემდეგ ერთ სტრიქონზე ზუსტად ამ ფორმატით: მუხლი <N> | <კანონის დასახელება> | <matsne.gov.ge ბმული>",
  `თუ ვერცერთ მუხლს ვერ ადასტურებ matsne.gov.ge-ზე — დააბრუნე ზუსტად და მხოლოდ ეს ფრაზა, სხვა არაფერი: ${NOT_FOUND_MSG}`,
  "არასოდეს გამოიგონო მუხლი, კანონის დასახელება ან ბმული — მხოლოდ რეალურად matsne.gov.ge-ზე დადასტურებული ინფორმაცია დაწერე.",
].join("\n");

export type ChatFallbackResult = {
  prose: string;
  article?: string;
  lawName?: string;
  url?: string;
};

/**
 * Last-resort answer path for the chat route — called only when the local
 * lexical search found zero matching articles (see route.ts), so neither the
 * cheap nor the expensive draft model had any real text to cite from. Runs
 * one web-search-enabled call restricted (by instruction) to matsne.gov.ge to
 * find and confirm a real provision the local search missed. Same fail-open
 * contract as searchWebContext/verifyLegalCitations: returns null on any
 * failure, disabled flag, missing key, timeout, or an unconfirmed/missing
 * matsne.gov.ge citation — never throws, so it can never itself turn into a
 * technical-error response; a clean null here means the caller falls back to
 * the ordinary NOT_FOUND_MSG.
 */
export async function verifyChatAnswer(
  question: string
): Promise<ChatFallbackResult | null> {
  if (!WEB_SEARCH_ON()) return null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = WEB_MODEL();
  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    max_tokens: 500,
    messages: [
      { role: "system", content: CHAT_FALLBACK_SYSTEM },
      { role: "user", content: question },
    ],
  };
  if (!hasNativeWebAccess(model)) {
    const webPlugin: Record<string, unknown> = {
      id: "web",
      max_results: WEB_MAX_RESULTS(),
    };
    const engine = process.env.OPENROUTER_WEB_ENGINE?.trim();
    if (engine) webPlugin.engine = engine;
    body.plugins = [webPlugin];
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const full: string = (json?.choices?.[0]?.message?.content ?? "").trim();
    if (!full || full === NOT_FOUND_MSG) return null;

    const idx = full.indexOf(CITATION_DELIM);
    if (idx === -1) return null; // no citation line — can't confirm a real article, discard

    const prose = full.slice(0, idx).trim();
    if (!prose) return null;

    const line = full.slice(idx + CITATION_DELIM.length).trim().split(/\r?\n/)[0] ?? "";
    const parts = line.split("|").map((s) => s.trim());
    const article = parts[0]?.replace(/^[-•*]\s*/, "");
    const lawName = parts[1];
    const url = parts[2];
    if (!url || !/^https?:\/\/(www\.)?matsne\.gov\.ge\//.test(url)) {
      return null; // no confirmed matsne.gov.ge source — don't trust an unsourced claim
    }
    return { prose, article, lawName, url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean. This function isn't wired into the route yet (Task 6), so no behavior change to test manually here.

- [ ] **Step 3: Commit**

```bash
git add src/lib/legal/openrouter.ts
git commit -m "feat: add matsne.gov.ge-verified web fallback for chat retrieval misses"
```

---

### Task 6: Wire the fallback into the route, fix the technical-error branch

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Interfaces:**
- Consumes: `verifyChatAnswer` and `ChatFallbackResult` from Task 5, `TECHNICAL_ERROR_MSG` from Task 1, `LegalBasisGroup` type (already imported implicitly via `buildLegalBasis`'s return type in `citations.ts`).

- [ ] **Step 1: Import `verifyChatAnswer`**

Add `verifyChatAnswer` to the existing `import { ... } from "@/lib/legal/openrouter"` block in `route.ts` (alongside `TECHNICAL_ERROR_MSG` added in Task 3).

- [ ] **Step 2: Fix the existing 502 branch to use `TECHNICAL_ERROR_MSG`**

Replace:

```ts
  if (!cheapIsGrounded) {
    try {
      const full = await generateLegalAnswer(messages, true);
      ({ prose, citations } = parseAnswer(full));
    } catch (err) {
      if (!prose) {
        return NextResponse.json(
          {
            error: "AI service unavailable",
            detail: String(err instanceof Error ? err.message : err),
          },
          { status: 502 }
        );
      }
      // Expensive retry failed but the cheap model at least produced
      // something — keep it rather than failing the request outright.
    }
  }
```

with:

```ts
  if (!cheapIsGrounded) {
    try {
      const full = await generateLegalAnswer(messages, true);
      ({ prose, citations } = parseAnswer(full));
    } catch {
      if (!prose) {
        return NextResponse.json(
          { answer: TECHNICAL_ERROR_MSG, legalBasis: [] },
          { status: 200 }
        );
      }
      // Expensive retry failed but the cheap model at least produced
      // something — keep it rather than failing the request outright.
    }
  }
```

- [ ] **Step 3: Add the Tier 2 fallback right before the final not-found check**

Replace:

```ts
  const answer = prose || NOT_FOUND_MSG;

  if (answer.trim() === NOT_FOUND_MSG) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  const legalBasis = buildLegalBasis(matches, citations);
```

with:

```ts
  let answer = prose || NOT_FOUND_MSG;
  let legalBasis = buildLegalBasis(matches, citations);

  // Only escalate to the web-verified fallback when local retrieval found
  // NOTHING to work with (matches.length === 0) — if matches existed but
  // citations still didn't verify, that's the existing cheap/expensive
  // retry's job (it already had the right law text), so don't double-spend.
  if (answer.trim() === NOT_FOUND_MSG && matches.length === 0) {
    const fallback = await verifyChatAnswer(question);
    if (fallback) {
      answer = fallback.prose;
      legalBasis =
        fallback.article && fallback.lawName && fallback.url
          ? [
              {
                lawName: fallback.lawName,
                url: fallback.url,
                items: [{ article: fallback.article, paragraph: null, subparagraph: null }],
              },
            ]
          : [];
    }
  }

  if (answer.trim() === NOT_FOUND_MSG) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }
```

- [ ] **Step 4: Verify — end-to-end scenarios**

Run: `npx tsc --noEmit` and `npm run lint` — expected clean.

Start dev server, sign in, run through:
1. A question with a known clean lexical hit — still answers via the cheap model, unaffected, legal basis shown from `matches`.
2. The originally-reported case — a real-law question phrased informally enough to miss lexical search (e.g. the "ნაშუქარი/ნაჩუქარი ქონება როგორ ნაწილდება?" question from the bug report). Confirm it now returns a real answer with a matsne.gov.ge source link instead of "not found."
3. A question truly outside all 8 laws' scope and not in Georgian law at all (e.g. "explain photosynthesis") — confirm it still correctly ends in "not found" (via `d.chat.notFound`), not an error.
4. Confirm `consultationsRemaining` did not decrement for scenario 3 (check the user's remaining count before/after in the dashboard, or query Mongo directly) but did decrement normally for scenarios 1 and 2.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: fall back to web-verified matsne.gov.ge lookup on a true retrieval miss"
```

---

### Task 7: Final full-pipeline regression pass

**Files:** none (verification only).

- [ ] **Step 1: Full lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: both clean.

- [ ] **Step 2: Production build sanity check**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Manual smoke test on `npm run dev`**

Re-run all four scenarios from Task 6 Step 4 once more against the fully-committed state, plus:
- Ask 2-3 more varied real questions across different laws (labor, consumer, admin-offenses) to confirm the existing cheap→expensive escalation and the normal happy path are unaffected by all the changes in this plan.
- Confirm the chat UI shows Georgian text correctly for both `d.chat.notFound` and `d.chat.technicalError` (no encoding issues, no literal `undefined`).

- [ ] **Step 4: Report back**

Summarize for the user (non-technical): confirm the original reported question now gets answered, confirm errors show a friendly retry message instead of a scary "not found", confirm nothing else in chat broke.
