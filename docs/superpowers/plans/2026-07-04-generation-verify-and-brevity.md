# Document Generation Verification, Mandatory Fields & Prompt Brevity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify generated documents' cited legal articles via web search, require the essential facts (city/date/party names) before generation, and tighten all three AI prompts (generate, analysis, improve) for brevity — while keeping Document Generation and Document Review/Improve fully independent (separate quotas, separate code paths, no shared logic beyond independently-applied wording).

**Architecture:** Four tasks. Task 1 adds a new pure function to the shared `openrouter.ts` module (already used only by chat today; this makes it also usable by generation, but generation gains a dependency on it, not the reverse — review/improve never touches this file). Task 2 wires that function into the generate route only. Task 3 is a frontend-only change to the generate page's question schema. Task 4 is three independent one-line prompt edits, one per route, touching neither route's quota logic.

**Tech Stack:** Next.js 16 App Router (Route Handlers + Client Component), TypeScript strict, no test runner configured.

## Global Constraints

- No test runner configured — verify every task with `npm run lint`, `npx tsc --noEmit`, and a manual dev-server check.
- Document Generation (`docGenerationRemaining`, `/api/generate*`) and Document Review/Improve (`docReviewRemaining`, `/api/review*`) must stay completely separate — no task in this plan touches quota-decrement logic in either route, and no task shares code between the two beyond the same brevity-wording *pattern* applied independently in each prompt.
- Citation verification is fail-open: any failure (disabled via env, missing API key, timeout, network error, non-200 response) must leave the originally-generated content untouched, never block or error out document generation.
- `maxTokens` ceilings on all three AI calls (`generate`: 16000, `review` analysis: 6000, `review/improve`: 16000) stay unchanged — brevity comes from prompt instructions, not from cutting the token ceiling.
- The `**სამართლებრივი საფუძვლები და წყაროები**` marker text in `src/app/api/generate/route.ts`'s `SYSTEM` prompt (already present, uncommitted from prior session work) must be preserved verbatim — Task 2 splits on this exact string, so it cannot be reworded by Task 4 without also updating Task 2's split logic. Task 4 only adds a brevity line elsewhere in the same prompt.

---

### Task 1: `verifyLegalCitations` — web-search fact-check for generated citations

**Files:**
- Modify: `src/lib/legal/openrouter.ts` (insert after line 404, the closing brace of `searchWebContext`)

**Interfaces:**
- Produces: `export async function verifyLegalCitations(docTypeName: string, citationsSection: string): Promise<string | null>` — Task 2 calls this with the document's type label and the raw text of its citations section, and treats a `null` return as "keep the original, don't touch it."
- Consumes: module-scope `OPENROUTER_URL`, `WEB_SEARCH_ON()`, `WEB_MODEL()`, `WEB_MAX_RESULTS()` (all already defined earlier in this same file, in scope — do not redefine or reimport them).

- [ ] **Step 1: Insert the new function**

In `src/lib/legal/openrouter.ts`, find the end of `searchWebContext` (the `}` on line 404, immediately followed by a blank line and then the `streamText` function's doc comment). Insert this new code between them:

```ts

const VERIFY_CITATIONS_SYSTEM = [
  "შენ ხარ ქართული სამართლის ფაქტების შემმოწმებელი.",
  "მოგეწოდება დოკუმენტის ტიპი და მისი \"სამართლებრივი საფუძვლები და წყაროები\" სექციის ტექსტი.",
  "ვებ ძიების გამოყენებით შეამოწმე თითოეული მასში მითითებული კანონი/კოდექსი და მუხლი — რეალურად არსებობს თუ არა.",
  "დააბრუნე მხოლოდ შესწორებული სექცია, ზუსტად იმავე ფორმატით: კანონის დასახელება ცალკე სტრიქონზე, შემდეგ მისი მუხლები ჩამონათვლის სახით.",
  "წაშალე ნებისმიერი მუხლი, რომლის არსებობასაც ვერ ადასტურებ.",
  "არასოდეს დაამატო ახალი მუხლი, რომელიც თავდაპირველ სიაში არ იყო.",
  "დააბრუნე მხოლოდ ტექსტი, დამატებითი ახსნის ან კომენტარის გარეშე.",
].join("\n");

/**
 * Web-search fact-check for a document generator's freeform "Legal Basis"
 * section: confirms each cited article actually exists, strips any that
 * can't be confirmed, never adds new ones. Same fail-open contract as
 * searchWebContext — returns null on any failure so callers can leave the
 * original AI-drafted citations untouched.
 */
export async function verifyLegalCitations(
  docTypeName: string,
  citationsSection: string
): Promise<string | null> {
  if (!WEB_SEARCH_ON()) return null;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = WEB_MODEL();
  const body: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: 600,
    messages: [
      { role: "system", content: VERIFY_CITATIONS_SYSTEM },
      {
        role: "user",
        content: `დოკუმენტის ტიპი: ${docTypeName}\n\nსექცია შესამოწმებლად:\n${citationsSection}`,
      },
    ],
  };
  if (!model.endsWith(":online")) {
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
    const content: string = (json?.choices?.[0]?.message?.content ?? "").trim();
    return content || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

This function isn't called from anywhere yet (Task 2 wires it up), so there's nothing to click through. Confirm by reading the file that `verifyLegalCitations` is exported, doesn't shadow any existing name, and that `OPENROUTER_URL`/`WEB_SEARCH_ON`/`WEB_MODEL`/`WEB_MAX_RESULTS` resolve to the existing module-scope declarations above it (no new imports needed).

- [ ] **Step 4: Commit**

```bash
git add src/lib/legal/openrouter.ts
git commit -m "feat: add web-search citation verification for document generation"
```

---

### Task 2: Wire citation verification into the generate route

**Files:**
- Modify: `src/app/api/generate/route.ts`

**Interfaces:**
- Consumes: `verifyLegalCitations` from Task 1 (`@/lib/legal/openrouter`).

- [ ] **Step 1: Import the new function and bump maxDuration**

Change:

```ts
import { GenerateDocSchema, DOC_TYPES } from "@/lib/validators";
import { callOpenRouterChat } from "@/lib/ai-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
```

to:

```ts
import { GenerateDocSchema, DOC_TYPES } from "@/lib/validators";
import { callOpenRouterChat } from "@/lib/ai-call";
import { verifyLegalCitations } from "@/lib/legal/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
```

- [ ] **Step 2: Split, verify, and splice after generation succeeds**

Find:

```ts
  let content: string;
  try {
    content = await callOpenRouterChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      undefined,
      16000
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;
```

Replace with:

```ts
  let content: string;
  try {
    content = await callOpenRouterChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      undefined,
      16000
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const CITATIONS_MARKER = "**სამართლებრივი საფუძვლები და წყაროები**";
  const markerIndex = content.indexOf(CITATIONS_MARKER);
  if (markerIndex !== -1) {
    const citationsSection = content.slice(markerIndex + CITATIONS_MARKER.length);
    const verified = await verifyLegalCitations(typeName, citationsSection);
    if (verified) {
      content = content.slice(0, markerIndex + CITATIONS_MARKER.length) + "\n" + verified;
    }
  }

  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;
```

- [ ] **Step 3: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run `npm run dev`, sign in, generate a document at `/generate`. Confirm the response still has a "სამართლებრივი საფუძვლები და წყაროები" section (verified-and-replaced, or original-if-verification-declined — either is a pass, since verification is best-effort). Then set `OPENROUTER_WEB_SEARCH=off` in `.env.local`, restart the dev server, generate another document, and confirm it still succeeds with its original (unverified) citations intact — proving the fail-open path doesn't break generation. Restore the env var afterward (or leave it however the project's `.env.local` had it before this check — don't commit an env change).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: verify generated document citations via web search before returning"
```

---

### Task 3: Mandatory fields (city, document date, key party names)

**Files:**
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- No new exports. `QuestionField` gains an optional `required?: boolean` property; a new `COMMON_FIELDS: QuestionField[]` constant is added; the `fields` computed value changes from `QUESTION_SCHEMAS[type] ?? []` to `[...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])]`.

- [ ] **Step 1: Extend the `QuestionField` type and add `COMMON_FIELDS`**

Change:

```tsx
type FieldType = "text" | "textarea" | "date";
type QuestionField = { key: string; label: string; type: FieldType };
```

to:

```tsx
type FieldType = "text" | "textarea" | "date";
type QuestionField = { key: string; label: string; type: FieldType; required?: boolean };

const COMMON_FIELDS: QuestionField[] = [
  { key: "city", label: "ქალაქი", type: "text", required: true },
  { key: "docDate", label: "დოკუმენტის თარიღი", type: "date", required: true },
];
```

- [ ] **Step 2: Mark the essential party-name fields required per type**

Change the `QUESTION_SCHEMAS` object's entries as follows (only the listed keys change — every other line in each array stays exactly as-is):

```tsx
const QUESTION_SCHEMAS: Record<string, QuestionField[]> = {
  complaint: [
    { key: "respondent", label: "ვის ეხება საჩივარი", type: "text", required: true },
    { key: "yourName", label: "შენი სახელი და გვარი", type: "text", required: true },
    { key: "amount", label: "თანხა/ზიანი (ასეთის არსებობისას)", type: "text" },
    { key: "incidentDate", label: "მოვლენის თარიღი", type: "date" },
  ],
  "rental-agreement": [
    { key: "landlord", label: "გამქირავებელი", type: "text", required: true },
    { key: "tenant", label: "დამქირავებელი", type: "text", required: true },
    { key: "address", label: "ბინის მისამართი", type: "text", required: true },
    { key: "rent", label: "ქირის ოდენობა", type: "text" },
    { key: "duration", label: "ხელშეკრულების ვადა", type: "text" },
  ],
  "employment-contract": [
    { key: "employer", label: "დამსაქმებელი", type: "text", required: true },
    { key: "employee", label: "თანამშრომელი", type: "text", required: true },
    { key: "position", label: "პოზიცია", type: "text" },
    { key: "salary", label: "ხელფასი", type: "text" },
    { key: "startDate", label: "დაწყების თარიღი", type: "date" },
  ],
  "power-of-attorney": [
    { key: "principal", label: "მინდობელი", type: "text", required: true },
    { key: "agent", label: "მინდობილი პირი", type: "text", required: true },
    { key: "scope", label: "მინდობის ფარგლები", type: "textarea" },
    { key: "idNumber", label: "პირადი ნომერი", type: "text" },
  ],
  "demand-letter": [
    { key: "recipient", label: "ადრესატი", type: "text", required: true },
    { key: "amount", label: "მოთხოვნილი თანხა", type: "text" },
    { key: "reason", label: "მოთხოვნის საფუძველი", type: "textarea" },
    { key: "deadline", label: "ვადა", type: "text" },
  ],
  "termination-notice": [
    { key: "employer", label: "დამსაქმებელი", type: "text", required: true },
    { key: "employee", label: "თანამშრომელი", type: "text", required: true },
    { key: "reason", label: "საფუძველი", type: "text" },
    { key: "lastDay", label: "ბოლო სამუშაო დღე", type: "date" },
  ],
};
```

- [ ] **Step 3: Compute `fields` from `COMMON_FIELDS` + the type schema, and compute missing-required list**

Change:

```tsx
  const fields = QUESTION_SCHEMAS[type] ?? [];
```

to:

```tsx
  const fields = [...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])];
```

After the existing `const details = buildDetails();` line, add:

```tsx
  const missingRequired = fields.filter((f) => f.required && !answers[f.key]?.trim());
```

- [ ] **Step 4: Disable Generate until required fields are filled, show what's missing**

Replace:

```tsx
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading} className="w-full">
```

with:

```tsx
            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                შესავსებია: {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading || missingRequired.length > 0} className="w-full">
```

- [ ] **Step 5: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual check**

Run `npm run dev`, visit `/generate`. Confirm every document type now shows "ქალაქი" and "დოკუმენტის თარიღი" fields first, above its type-specific fields. Confirm the Generate button is disabled (and the "შესავსებია: ..." hint lists the missing labels) until city, document date, and that type's required party-name fields are all filled — then confirm it enables once they are, and that switching document type recomputes the missing-required list for the new type's fields (not the old type's).

- [ ] **Step 7: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: require city, document date, and key party names before generating"
```

---

### Task 4: Brevity instructions in all three AI prompts

**Files:**
- Modify: `src/app/api/generate/route.ts:13-23` (the `SYSTEM` constant)
- Modify: `src/lib/legal/document-analysis.ts:137-157` (`ANALYSIS_SYSTEM_PROMPT`)
- Modify: `src/lib/legal/document-analysis.ts:225-250` (`IMPROVEMENT_SYSTEM_PROMPT`)

**Interfaces:**
- No signature changes — all three stay `string` constants used exactly as before by their respective routes.

- [ ] **Step 1: Add brevity to the generate `SYSTEM` prompt**

In `src/app/api/generate/route.ts`, find (note this already includes the citations-section instruction from prior session work — only the two lines shown here change, the rest of the constant stays untouched):

```ts
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
მნიშვნელოვანი მონაცემები (სახელები, თარიღები, თანხები, პირადი ნომრები), რომლებიც მომხმარებელმა მიუთითა, გამოკვეთე **მუქი შრიფტით** (markdown-ის ** სინტაქსით).
```

Replace with:

```ts
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
იყავი მაქსიმალურად ლაკონური — ყოველგვარი ზედმეტი ფრაზის, გამეორების ან შესავალი წინადადების გარეშე, მხოლოდ საჭირო სამართლებრივი შინაარსი მარტივი და გასაგები ენით.
მნიშვნელოვანი მონაცემები (სახელები, თარიღები, თანხები, პირადი ნომრები), რომლებიც მომხმარებელმა მიუთითა, გამოკვეთე **მუქი შრიფტით** (markdown-ის ** სინტაქსით).
```

- [ ] **Step 2: Add brevity to `ANALYSIS_SYSTEM_PROMPT`**

In `src/lib/legal/document-analysis.ts`, find:

```ts
წესები:
- გამოავლინე 2-დან 8-მდე კონკრეტული რისკი, დოკუმენტის რეალურ შინაარსზე დაყრდნობით.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;
```

Replace with:

```ts
წესები:
- გამოავლინე 2-დან 8-მდე კონკრეტული რისკი, დოკუმენტის რეალურ შინაარსზე დაყრდნობით.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- იყავი მაქსიმალურად მოკლე და კონკრეტული — ახსენი მხოლოდ არსებითი, ზედმეტი სიტყვების ან გამეორების გარეშე.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;
```

- [ ] **Step 3: Add brevity to `IMPROVEMENT_SYSTEM_PROMPT`**

In the same file, find:

```ts
წესები:
- თუ დოკუმენტში აკლია კონკრეტული მონაცემი (მაგ. სახელი, თარიღი, მისამართი), ნუ გამოიგონებ მას — ჩასვი placeholder კვადრატულ ფრჩხილებში, ინგლისურად, UPPER_SNAKE_CASE ფორმატით, მაგალითად [LESSOR_NAME], [DATE], [ADDRESS].
- თუ ინფორმაცია ბუნდოვანია ან ეწინააღმდეგება ერთმანეთს (და არა უბრალოდ აკლია), ნუ გამოიგონებ პასუხს — დაამატე კონკრეტული შეკითხვა "questions" მასივში.
- findings ასახავდეს შესწორებული ტექსტის რისკებს, არა თავდაპირველისას.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- თუ დამატებითი შეკითხვა არ გჭირდება, დააბრუნე ცარიელი "questions": [].
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;
```

Replace with:

```ts
წესები:
- თუ დოკუმენტში აკლია კონკრეტული მონაცემი (მაგ. სახელი, თარიღი, მისამართი), ნუ გამოიგონებ მას — ჩასვი placeholder კვადრატულ ფრჩხილებში, ინგლისურად, UPPER_SNAKE_CASE ფორმატით, მაგალითად [LESSOR_NAME], [DATE], [ADDRESS].
- თუ ინფორმაცია ბუნდოვანია ან ეწინააღმდეგება ერთმანეთს (და არა უბრალოდ აკლია), ნუ გამოიგონებ პასუხს — დაამატე კონკრეტული შეკითხვა "questions" მასივში.
- findings ასახავდეს შესწორებული ტექსტის რისკებს, არა თავდაპირველისას.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- თუ დამატებითი შეკითხვა არ გჭირდება, დააბრუნე ცარიელი "questions": [].
- იყავი მაქსიმალურად მოკლე და კონკრეტული — ახსენი მხოლოდ არსებითი, ზედმეტი სიტყვების ან გამეორების გარეშე.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Generate a document, run a document review, and run a document-review improvement — confirm all three still produce valid output in their expected shape (document text with a Sources section; JSON with `summary`/`findings`/`recommendations`; JSON with `revisedText`/etc.) and that none of the three routes' quota fields (`docGenerationRemaining` for generate, `docReviewRemaining` for review/improve) were touched by this change — this task only edits prompt string literals, no logic.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/generate/route.ts src/lib/legal/document-analysis.ts
git commit -m "feat: tighten generation, analysis, and improvement prompts for brevity"
```

---

## Execution Order

Task 1 must precede Task 2 (Task 2 imports Task 1's export). Task 3 and Task 4 are independent of Tasks 1-2 and of each other (Task 3 is frontend-only on `generate-client.tsx`; Task 4 touches prompt text in two files, one of which — `generate/route.ts`'s `SYSTEM` — is also touched by Task 2, but at a different, non-overlapping location in the same constant, so order between Task 2 and Task 4 doesn't matter as long as they're not run as literally parallel edits to the same file in the same moment). Recommended order: 1, 2, 3, 4.
