# Document Analysis Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working "Document Analysis" feature — a modal (no page navigation) opened from the homepage's "Documents" card that lets a user upload a PDF/DOCX/TXT/MD file, runs AI risk analysis (categorized risks, severity, explanations, recommendations), and renders the structured results in the modal.

**Architecture:** Extend the existing `/review` feature (model + API route) in place rather than build a parallel system. Add real PDF/DOCX text extraction, restructure the AI output into categorized+severity-tagged findings, build a new shadcn `Dialog`-based modal component, and wire the homepage's third service card to open it. Consultation (`/chat`, `/api/chat`) is never touched.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Mongoose, shadcn/ui (`Dialog`, `Badge`, `Card`, `Button`), OpenRouter via `src/lib/ai-call.ts`, new deps `pdf-parse` + `mammoth`.

**Spec:** `docs/superpowers/specs/2026-07-03-document-analysis-modal-design.md`

## Global Constraints

- Do not modify `/chat`, `src/app/chat/chat-client.tsx`, `src/app/api/chat/route.ts`, or `src/lib/legal/openrouter.ts`.
- Do not change the visual layout/design of any existing page. The only permitted visual changes are: (a) the new modal itself, (b) the "Documents" homepage card becoming clickable instead of a disabled "coming soon" card — same classes/markup, just a `<button>` instead of an inert `<div>`, and (c) the findings list inside `/review` and `/dashboard/reviews` switching from plain bullet strings to the new structured card (unavoidable consequence of the shared API's response shape changing — kept minimal).
- No test runner is configured in this repo (confirmed in `CLAUDE.md`). In place of automated unit tests, each task's "Verify" step uses `npx tsc --noEmit` (typecheck), `npm run lint`, and/or a manual `npm run dev` exercise. The final task does a full manual end-to-end pass.
- Risk categories (fixed): `liability`, `financial`, `termination`, `compliance`, `confidentiality`, `obligations`.
- Risk severities (fixed): `low`, `medium`, `high`, `critical`.
- Max uploaded file size: 10MB. Supported extensions: `.pdf`, `.docx`, `.txt`, `.md`.
- Georgian (`ka`) is the source-of-truth locale; every new UI string needs an `en` mirror in `src/lib/i18n/dictionaries.ts`.

---

### Task 1: Document analysis library — extraction, prompt, response parsing

**Files:**
- Modify: `package.json` (add `pdf-parse`, `mammoth`; add `@types/pdf-parse` to devDependencies)
- Create: `src/lib/legal/document-analysis.ts`
- Create (only if needed, see Step 4): `src/types/pdf-parse.d.ts`

**Interfaces:**
- Produces: `RISK_CATEGORIES: readonly string[]`, `RiskCategory`, `RISK_SEVERITIES: readonly string[]`, `RiskSeverity`, `RiskFinding { category, severity, title, explanation, recommendation }`, `DocumentAnalysisResult { summary, findings, recommendations }`, `MAX_ANALYSIS_TEXT: number`, `MAX_FILE_BYTES: number`, `SUPPORTED_EXTENSIONS`, `extensionOf(fileName): string`, `isSupportedExtension(ext): boolean`, `extractDocumentText(fileName, buffer): Promise<string>`, `ANALYSIS_SYSTEM_PROMPT: string`, `parseAnalysisResponse(raw): DocumentAnalysisResult` (throws on unparseable input).

- [ ] **Step 1: Install dependencies**

```bash
npm install pdf-parse mammoth
```

Note: `pdf-parse` is at major v2, a class-based API (`PDFParse`), not the v1
`pdf(buffer) => {text}` function some training data assumes. It ships its own
types — no `@types/pdf-parse` needed (installing it would target the wrong,
outdated v1 API shape).

- [ ] **Step 2: Create the library module**

Create `src/lib/legal/document-analysis.ts`:

```ts
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const RISK_CATEGORIES = [
  "liability",
  "financial",
  "termination",
  "compliance",
  "confidentiality",
  "obligations",
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const RISK_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export interface RiskFinding {
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  recommendation: string;
}

export interface DocumentAnalysisResult {
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
}

export const MAX_ANALYSIS_TEXT = 10_000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx === -1 ? "" : fileName.slice(idx + 1).toLowerCase();
}

export function isSupportedExtension(ext: string): ext is SupportedExtension {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

export async function extractDocumentText(fileName: string, buffer: Buffer): Promise<string> {
  const ext = extensionOf(fileName);
  if (ext === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString("utf-8").replace(/\0/g, " ");
}

export const ANALYSIS_SYSTEM_PROMPT = `შენ ხარ ქართული იურიდიული დოკუმენტების რისკ-ანალიტიკოსი.
გაანალიზე მოწოდებული დოკუმენტი და დააბრუნე მხოლოდ JSON, ზუსტად ამ ფორმატით, დამატებითი ტექსტის ან ახსნის გარეშე:

{
  "summary": "მოკლე შეჯამება 2-3 წინადადებით",
  "findings": [
    {
      "category": "liability | financial | termination | compliance | confidentiality | obligations",
      "severity": "low | medium | high | critical",
      "title": "მოკლე სათაური",
      "explanation": "რატომ არის ეს რისკი",
      "recommendation": "კონკრეტული რჩევა ამ რისკთან დაკავშირებით"
    }
  ],
  "recommendations": ["ზოგადი რეკომენდაცია 1", "ზოგადი რეკომენდაცია 2"]
}

წესები:
- გამოავლინე 2-დან 8-მდე კონკრეტული რისკი, დოკუმენტის რეალურ შინაარსზე დაყრდნობით.
- category და severity მნიშვნელობები ზუსტად ზემოთ ჩამოთვლილთაგან უნდა იყოს, სხვა მნიშვნელობა დაუშვებელია.
- უპასუხე ქართულ ენაზე, მხოლოდ JSON ობიექტით — არც ერთი დამატებითი სიტყვა ჯსონის გარეთ.`;

function coerceCategory(value: unknown): RiskCategory {
  return (RISK_CATEGORIES as readonly string[]).includes(String(value))
    ? (value as RiskCategory)
    : "compliance";
}

function coerceSeverity(value: unknown): RiskSeverity {
  return (RISK_SEVERITIES as readonly string[]).includes(String(value))
    ? (value as RiskSeverity)
    : "medium";
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

export function parseAnalysisResponse(raw: string): DocumentAnalysisResult {
  const jsonText = extractJsonBlock(raw);
  let parsed: { summary?: unknown; findings?: unknown; recommendations?: unknown };
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!summary) throw new Error("AI response missing summary");

  const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings: RiskFinding[] = findingsRaw
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      category: coerceCategory(f.category),
      severity: coerceSeverity(f.severity),
      title: typeof f.title === "string" ? f.title : "",
      explanation: typeof f.explanation === "string" ? f.explanation : "",
      recommendation: typeof f.recommendation === "string" ? f.recommendation : "",
    }))
    .filter((f) => f.title || f.explanation);

  const recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations.filter((r): r is string => typeof r === "string")
    : [];

  return { summary, findings, recommendations };
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `document-analysis.ts`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/legal/document-analysis.ts
git commit -m "feat: add document analysis extraction/prompt/parsing library"
```

---

### Task 2: Structured findings on the DocumentReview model

**Files:**
- Modify: `src/lib/models/document-review.ts`

**Interfaces:**
- Consumes: `RISK_CATEGORIES`, `RISK_SEVERITIES` from Task 1's `src/lib/legal/document-analysis.ts`.
- Produces: `DocumentReview` Mongoose model whose `findings` field is now `[{category, severity, title, explanation, recommendation}]` instead of `[String]`. `DocumentReviewDoc` type updated accordingly. Existing rows already in MongoDB keep their old `string[]` shape (no migration — read-side code must handle both, see Tasks 5-6).

- [ ] **Step 1: Rewrite the schema**

Replace the full contents of `src/lib/models/document-review.ts`:

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { RISK_CATEGORIES, RISK_SEVERITIES } from "@/lib/legal/document-analysis";

const RiskFindingSchema = new Schema(
  {
    category: { type: String, enum: [...RISK_CATEGORIES], required: true },
    severity: { type: String, enum: [...RISK_SEVERITIES], required: true },
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    recommendation: { type: String, required: true },
  },
  { _id: false }
);

const DocumentReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, default: "document" },
    summary: { type: String, required: true },
    findings: { type: [RiskFindingSchema], default: [] },
    recommendations: { type: [String], default: [] },
  },
  { timestamps: true }
);

export type DocumentReviewDoc = InferSchemaType<typeof DocumentReviewSchema> & { _id: unknown };

export const DocumentReview: Model<DocumentReviewDoc> =
  (models.DocumentReview as Model<DocumentReviewDoc>) ||
  model<DocumentReviewDoc>("DocumentReview", DocumentReviewSchema);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `document-review.ts`. (Errors in `src/app/api/review/route.ts`, `review-client.tsx`, or the dashboard reviews page at this point are expected — they're fixed in Tasks 4-6.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/document-review.ts
git commit -m "feat: structure DocumentReview findings with category/severity"
```

---

### Task 3: Shared risk-finding display component

**Files:**
- Create: `src/components/site/risk-finding-card.tsx`

**Interfaces:**
- Consumes: `RiskFinding`, `RiskCategory`, `RiskSeverity` types from `src/lib/legal/document-analysis.ts`.
- Produces: `RiskFindingCard({ finding: RiskFinding, locale: "ka" | "en" }): JSX.Element` and `isStructuredFinding(f: unknown): f is RiskFinding` — used by Tasks 5, 6, 8 to render findings consistently (new object shape) while still being able to detect legacy `string` findings from pre-existing DB rows.

- [ ] **Step 1: Create the component**

Create `src/components/site/risk-finding-card.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskCategory, RiskFinding, RiskSeverity } from "@/lib/legal/document-analysis";

export function isStructuredFinding(f: unknown): f is RiskFinding {
  return typeof f === "object" && f !== null && "category" in f && "severity" in f;
}

const CATEGORY_LABELS: Record<"ka" | "en", Record<RiskCategory, string>> = {
  ka: {
    liability: "პასუხისმგებლობა და ჯარიმები",
    financial: "ფინანსური პირობები",
    termination: "შეწყვეტა და გაგრძელება",
    compliance: "სამართლებრივი შესაბამისობა",
    confidentiality: "მონაცემები და კონფიდენციალურობა",
    obligations: "ვალდებულებები და ვადები",
  },
  en: {
    liability: "Liability & Penalties",
    financial: "Financial Terms",
    termination: "Termination & Renewal",
    compliance: "Compliance & Legal",
    confidentiality: "Data & Confidentiality",
    obligations: "Obligations & Deadlines",
  },
};

const SEVERITY_LABELS: Record<"ka" | "en", Record<RiskSeverity, string>> = {
  ka: { low: "დაბალი", medium: "საშუალო", high: "მაღალი", critical: "კრიტიკული" },
  en: { low: "Low", medium: "Medium", high: "High", critical: "Critical" },
};

const SEVERITY_BORDER: Record<RiskSeverity, string> = {
  low: "border-t-green-500",
  medium: "border-t-yellow-500",
  high: "border-t-orange-500",
  critical: "border-t-destructive",
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  low: "bg-green-500/10 text-green-700 dark:text-green-400",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  high: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  critical: "bg-destructive/10 text-destructive",
};

export function RiskFindingCard({
  finding,
  locale,
}: {
  finding: RiskFinding;
  locale: "ka" | "en";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 border-t-[3px]",
        SEVERITY_BORDER[finding.severity]
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge variant="outline" className={SEVERITY_BADGE[finding.severity]}>
          {SEVERITY_LABELS[locale][finding.severity]}
        </Badge>
        <Badge variant="secondary">{CATEGORY_LABELS[locale][finding.category]}</Badge>
      </div>
      <p className="font-semibold text-sm text-foreground">{finding.title}</p>
      {finding.explanation && (
        <p className="text-sm text-muted-foreground mt-1">{finding.explanation}</p>
      )}
      {finding.recommendation && (
        <p className="text-sm mt-2 flex items-start gap-1.5">
          <span className="font-semibold text-primary shrink-0">→</span>
          <span>{finding.recommendation}</span>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `risk-finding-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/risk-finding-card.tsx
git commit -m "feat: add shared risk finding card component"
```

---

### Task 4: Rewrite `/api/review` to use real extraction + structured output

**Files:**
- Modify: `src/app/api/review/route.ts`

**Interfaces:**
- Consumes: everything from Task 1 (`ANALYSIS_SYSTEM_PROMPT`, `MAX_ANALYSIS_TEXT`, `MAX_FILE_BYTES`, `extensionOf`, `isSupportedExtension`, `extractDocumentText`, `parseAnalysisResponse`), `DocumentReview` from Task 2, existing `callOpenRouterChat` from `src/lib/ai-call.ts`.
- Produces: `POST /api/review` — same auth/quota contract as before (401 unauthenticated, 403 quota exceeded), now additionally 400 for unsupported/oversized file, 502 for AI failure or unparseable AI response. Success response: `{ id, fileName, summary, findings: RiskFinding[], recommendations: string[] }`, status 201.

- [ ] **Step 1: Replace the route**

Replace the full contents of `src/app/api/review/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { callOpenRouterChat } from "@/lib/ai-call";
import {
  ANALYSIS_SYSTEM_PROMPT,
  MAX_ANALYSIS_TEXT,
  MAX_FILE_BYTES,
  extensionOf,
  isSupportedExtension,
  extractDocumentText,
  parseAnalysisResponse,
} from "@/lib/legal/document-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docReviewRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Document review quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  let text = "";
  let fileName = "document";

  if (ct.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pastedText = formData.get("text") as string | null;
    if (file && file.size > 0) {
      fileName = file.name;
      const ext = extensionOf(fileName);
      if (!isSupportedExtension(ext)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF, DOCX, TXT, or MD." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File too large (max 10MB)." }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      try {
        text = await extractDocumentText(fileName, buf);
      } catch (err) {
        return NextResponse.json(
          {
            error: "Could not read document contents",
            detail: String(err instanceof Error ? err.message : err),
          },
          { status: 400 }
        );
      }
    } else if (pastedText) {
      text = pastedText;
    }
  } else {
    try {
      const body = (await req.json()) as { text?: string; fileName?: string };
      text = String(body.text ?? "");
      fileName = String(body.fileName ?? "document");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  text = text.replace(/\s+/g, " ").trim().slice(0, MAX_ANALYSIS_TEXT);
  if (!text) {
    return NextResponse.json({ error: "No document text provided" }, { status: 400 });
  }

  let raw: string;
  try {
    raw = await callOpenRouterChat([
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `გაანალიზე ეს დოკუმენტი:\n\n${text}` },
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  let analysis;
  try {
    analysis = parseAnalysisResponse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI returned an unreadable response",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const reviewCreate = DocumentReview.create({
    userId: session.user.id,
    fileName,
    summary: analysis.summary,
    findings: analysis.findings,
    recommendations: analysis.recommendations,
  });
  const saveOps: Promise<unknown>[] = [reviewCreate];
  if (!isAdmin) {
    saveOps.push(User.findByIdAndUpdate(session.user.id, { $inc: { docReviewRemaining: -1 } }));
  }
  const [review] = await Promise.all(saveOps);

  return NextResponse.json(
    {
      id: String((review as { _id: unknown })._id),
      fileName,
      summary: analysis.summary,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
    },
    { status: 201 }
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `api/review/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review/route.ts
git commit -m "feat: real PDF/DOCX extraction + structured risk output in /api/review"
```

---

### Task 5: Fix `/review` page for the new response shape

**Files:**
- Modify: `src/app/review/review-client.tsx`

**Interfaces:**
- Consumes: `RiskFindingCard`, `isStructuredFinding` from Task 3; `RiskFinding` type from Task 1.
- Produces: `/review` page renders correctly against the new `/api/review` JSON shape (`findings: RiskFinding[]`), same page layout as before otherwise.

- [ ] **Step 1: Update the type and render logic**

In `src/app/review/review-client.tsx`, change the `ReviewResult` type (line 26-32) and the findings-rendering block (lines 193-208).

Replace:
```ts
type ReviewResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: string[];
  recommendations: string[];
};
```
with:
```ts
import type { RiskFinding } from "@/lib/legal/document-analysis";
import { RiskFindingCard } from "@/components/site/risk-finding-card";

type ReviewResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
};
```

Replace the findings block:
```tsx
            {result.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  ნაპოვნი პრობლემები ({result.findings.length})
                </p>
                <ul className="space-y-1.5">
                  {result.findings.map((f, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
```
with:
```tsx
            {result.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  ნაპოვნი რისკები ({result.findings.length})
                </p>
                <div className="space-y-3">
                  {result.findings.map((f, i) => (
                    <RiskFindingCard key={i} finding={f} locale="ka" />
                  ))}
                </div>
              </div>
            )}
```

Move the `import type { RiskFinding } ...` and `import { RiskFindingCard } ...` lines up to the top of the file with the other imports (not inline where shown above — that's for readability of the diff only).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `review-client.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/review/review-client.tsx
git commit -m "fix: render structured risk findings on /review page"
```

---

### Task 6: Fix `/dashboard/reviews` for mixed old/new finding shapes

**Files:**
- Modify: `src/app/dashboard/reviews/page.tsx`

**Interfaces:**
- Consumes: `RiskFindingCard`, `isStructuredFinding` from Task 3.
- Produces: history page renders both legacy `string` findings (old DB rows, pre-this-feature) and new structured findings without crashing.

- [ ] **Step 1: Update the findings render block**

In `src/app/dashboard/reviews/page.tsx`, add the import:

```ts
import { RiskFindingCard, isStructuredFinding } from "@/components/site/risk-finding-card";
```

Replace the findings block (lines 80-94):
```tsx
                  {findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> ნაპოვნი პრობლემები
                      </p>
                      <ul className="space-y-1">
                        {findings.map((f, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
```
with:
```tsx
                  {findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> ნაპოვნი რისკები
                      </p>
                      <div className="space-y-2">
                        {findings.map((f, i) =>
                          isStructuredFinding(f) ? (
                            <RiskFindingCard key={i} finding={f} locale="ka" />
                          ) : (
                            <div key={i} className="text-sm flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                              {String(f)}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `dashboard/reviews/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/reviews/page.tsx
git commit -m "fix: render both legacy and structured findings on reviews history page"
```

---

### Task 7: i18n strings for the modal

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Produces: new `documentAnalysis` key on `Dict` (present in both `ka` and `en`), consumed by Task 8's modal component via `getDict(locale).documentAnalysis`.

- [ ] **Step 1: Add the `ka` section**

In `src/lib/i18n/dictionaries.ts`, add a new top-level key to the `ka` object (after the `profile` key, before the closing `}` at line 267-268):

```ts
  documentAnalysis: {
    title: "დოკუმენტის ანალიზი",
    subtitle: "AI აანალიზებს რისკებს კატეგორიების მიხედვით",
    dropzoneHint: "აირჩიეთ ფაილი — PDF, DOCX, TXT ან MD",
    chooseFile: "ფაილის არჩევა",
    changeFile: "ფაილის შეცვლა",
    analyzeCta: "გაანალიზება",
    analyzing: "ანალიზი მიმდინარეობს...",
    summaryLabel: "შეჯამება",
    findingsLabel: "გამოვლენილი რისკები",
    recommendationsLabel: "ზოგადი რეკომენდაციები",
    noFileError: "ატვირთეთ ფაილი გასაანალიზებლად",
    unsupportedTypeError: "მხარდაუჭერელი ფაილის ტიპი — მხოლოდ PDF, DOCX, TXT, MD",
    tooLargeError: "ფაილი ძალიან დიდია (მაქს. 10MB)",
    loginRequired: "გასაგრძელებლად საჭიროა ავტორიზაცია",
    loginCta: "შესვლა",
    quotaExceeded: "დოკუმენტის ანალიზის ლიმიტი ამოწურულია",
    upgradeCta: "გეგმის განახლება",
    genericError: "შეცდომა — სცადეთ ხელახლა",
    retryCta: "თავიდან ცდა",
    viewAllCta: "ყველა ანალიზის ნახვა",
    resultsSavedNote: "შედეგი ინახება თქვენს ანგარიშში",
  },
```

- [ ] **Step 2: Add the matching `en` section**

Add the same key to the `en` object (after `profile`, before the closing `}` at line 536-537):

```ts
  documentAnalysis: {
    title: "Document Analysis",
    subtitle: "AI analyzes risks by category",
    dropzoneHint: "Choose a file — PDF, DOCX, TXT, or MD",
    chooseFile: "Choose file",
    changeFile: "Change file",
    analyzeCta: "Analyze",
    analyzing: "Analyzing...",
    summaryLabel: "Summary",
    findingsLabel: "Identified risks",
    recommendationsLabel: "General recommendations",
    noFileError: "Upload a file to analyze",
    unsupportedTypeError: "Unsupported file type — PDF, DOCX, TXT, MD only",
    tooLargeError: "File is too large (max 10MB)",
    loginRequired: "Please sign in to continue",
    loginCta: "Sign in",
    quotaExceeded: "Document analysis quota exceeded",
    upgradeCta: "Upgrade plan",
    genericError: "Error — please try again",
    retryCta: "Retry",
    viewAllCta: "View all analyses",
    resultsSavedNote: "Results are saved to your account",
  },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (the `Dict` type is inferred from `ka`, so `en` must have every key `ka` has — a mismatch fails typecheck).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries.ts
git commit -m "feat: add i18n strings for document analysis modal"
```

---

### Task 8: Document Analysis modal component

**Files:**
- Create: `src/components/site/document-analysis-modal.tsx`

**Interfaces:**
- Consumes: shadcn `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogDescription` (`@/components/ui/dialog`), `Button` (`@/components/ui/button`), `RiskFindingCard` (Task 3), `getDict` + `Locale` (`@/lib/i18n/dictionaries`, `@/lib/i18n/config`), `RiskFinding` type (Task 1).
- Produces: `DocumentAnalysisModal({ open, onOpenChange, locale }: { open: boolean; onOpenChange: (open: boolean) => void; locale: Locale }): JSX.Element` — fully self-contained (owns its own file/loading/result/error state), calls `POST /api/review` with `multipart/form-data`. Consumed by Task 9's `ServiceCards` component.

- [ ] **Step 1: Create the component**

Create `src/components/site/document-analysis-modal.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiskFindingCard } from "@/components/site/risk-finding-card";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { RiskFinding } from "@/lib/legal/document-analysis";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 10 * 1024 * 1024;
const SUPPORTED = ["pdf", "docx", "txt", "md"];

type AnalysisResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
};

type Status = "idle" | "ready" | "analyzing" | "results" | "error";

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function DocumentAnalysisModal({
  open,
  onOpenChange,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}) {
  const t = getDict(locale).documentAnalysis;
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [errorKind, setErrorKind] = useState<
    "unsupported" | "tooLarge" | "unauthorized" | "quota" | "generic" | null
  >(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus("idle");
    setFile(null);
    setErrorKind(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!SUPPORTED.includes(extOf(picked.name))) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setErrorKind("tooLarge");
      setStatus("error");
      return;
    }
    setFile(picked);
    setErrorKind(null);
    setStatus("ready");
  }

  async function analyze() {
    if (!file) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    setErrorKind(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/review", { method: "POST", body: formData });
      if (res.status === 401) {
        setErrorKind("unauthorized");
        setStatus("error");
        return;
      }
      if (res.status === 403) {
        setErrorKind("quota");
        setStatus("error");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorKind("generic");
        setStatus("error");
        return;
      }
      setResult(data as AnalysisResult);
      setStatus("results");
    } catch {
      setErrorKind("generic");
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>

        {(status === "idle" || status === "ready") && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center gap-2 text-center"
            >
              <FileUp className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : t.dropzoneHint}
              </p>
              <span className="text-xs text-muted-foreground">
                {file ? t.changeFile : t.chooseFile}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handlePick}
            />
            <Button onClick={analyze} disabled={!file} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              {t.analyzeCta}
            </Button>
          </div>
        )}

        {status === "analyzing" && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t.analyzing}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {errorKind === "unsupported" && t.unsupportedTypeError}
                {errorKind === "tooLarge" && t.tooLargeError}
                {errorKind === "unauthorized" && t.loginRequired}
                {errorKind === "quota" && t.quotaExceeded}
                {errorKind === "generic" && t.genericError}
              </span>
            </div>
            {errorKind === "unauthorized" && (
              <a href="/login" className="block">
                <Button className="w-full">{t.loginCta}</Button>
              </a>
            )}
            {errorKind === "quota" && (
              <a href="/pricing" className="block">
                <Button className="w-full">{t.upgradeCta}</Button>
              </a>
            )}
            {(errorKind === "generic" || errorKind === "unsupported" || errorKind === "tooLarge") && (
              <Button variant="outline" className="w-full" onClick={reset}>
                {t.retryCta}
              </Button>
            )}
          </div>
        )}

        {status === "results" && result && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{t.summaryLabel}</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>

            {result.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t.findingsLabel} ({result.findings.length})
                </p>
                <div className="space-y-3">
                  {result.findings.map((f, i) => (
                    <RiskFindingCard key={i} finding={f} locale={locale} />
                  ))}
                </div>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t.recommendationsLabel}
                </p>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-2 border-t">{t.resultsSavedNote}</p>
            <Button variant="outline" className="w-full" onClick={reset}>
              {t.chooseFile}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Confirm `Locale` export exists**

Run: `grep -n "export type Locale" src/lib/i18n/config.ts` (or open the file). If the export is named differently, adjust the `import type { Locale }` line in the component to match.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `document-analysis-modal.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/document-analysis-modal.tsx
git commit -m "feat: add document analysis modal component"
```

---

### Task 9: Wire the homepage "Documents" card to open the modal

**Files:**
- Modify: `src/lib/homepage-defaults.ts`
- Create: `src/components/site/service-cards.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `DocumentAnalysisModal` from Task 8.
- Produces: `ServiceCards` client component rendering the exact same markup `page.tsx` currently inlines, taking the same computed values as props, with the `/review` card opening the modal via a `<button>` instead of navigating via `<Link>`.

- [ ] **Step 1: Flip the seed card**

In `src/lib/homepage-defaults.ts`, change `serviceCards[2]` (the `sc-3` entry, lines 32-38):

```ts
    {
      _id: "sc-3",
      title: "დოკუმენტები", titleEn: "Documents",
      subtitle: "დოკუმენტის ანალიზი", subtitleEn: "Check a document",
      ctaText: "ფაილის შემოწმება", ctaTextEn: "Check file",
      href: "/docs", icon: "FolderOpen", comingSoon: true, visible: true, order: 2,
    },
```
to:
```ts
    {
      _id: "sc-3",
      title: "დოკუმენტები", titleEn: "Documents",
      subtitle: "დოკუმენტის ანალიზი", subtitleEn: "Check a document",
      ctaText: "ფაილის შემოწმება", ctaTextEn: "Check file",
      href: "/review", icon: "FolderOpen", comingSoon: false, visible: true, order: 2,
    },
```

- [ ] **Step 2: Extract the service-cards grid into its own client component**

Create `src/components/site/service-cards.tsx`. This is the same JSX currently in `src/app/page.tsx` lines 159-216, moved verbatim except the `/review` card becomes a modal trigger:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import { DocumentAnalysisModal } from "@/components/site/document-analysis-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

type ServiceCard = {
  _id: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  ctaText?: string;
  ctaTextEn?: string;
};

export function ServiceCards({
  cards,
  visibleHrefs,
  resolveIcon,
  pick,
  seedCardById,
  cardsHeading,
  locale,
  d,
}: {
  cards: ServiceCard[];
  visibleHrefs: Set<string>;
  resolveIcon: (name: string) => LucideIcon;
  pick: (ka: string, en: string | undefined | null, locale: Locale) => string;
  seedCardById: Map<string, ServiceCard>;
  cardsHeading: string;
  locale: Locale;
  d: Dict;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
        {cardsHeading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          if (!visibleHrefs.has(card.href)) {
            return <div key={card._id} className="invisible" aria-hidden="true" />;
          }
          const CardIcon = resolveIcon(card.icon);
          const seedCard = seedCardById.get(card._id);
          const cardTitle = pick(card.title, card.titleEn || seedCard?.titleEn, locale);
          const cardSubtitle = pick(card.subtitle, card.subtitleEn || seedCard?.subtitleEn, locale);
          const cardCta =
            pick(card.ctaText || seedCard?.ctaText || "", card.ctaTextEn || seedCard?.ctaTextEn, locale) ||
            d.home.learnMore;

          if (card.comingSoon) {
            return (
              <AnimateIn key={card._id} delay={idx * 80}>
                <div className="border-t-[3px] border-t-border bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 opacity-55 cursor-default h-full">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <CardIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-base leading-snug">{cardTitle}</p>
                    <p className="text-sm text-muted-foreground mt-1">{cardSubtitle}</p>
                  </div>
                  <div className="mt-auto text-xs tracking-widest uppercase text-muted-foreground font-semibold">
                    {d.home.comingSoon}
                  </div>
                </div>
              </AnimateIn>
            );
          }

          const cardClasses =
            "border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 card-hover group h-full";
          const cardInner = (
            <>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CardIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base leading-snug">{cardTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{cardSubtitle}</p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                {cardCta} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </>
          );

          if (card.href === "/review") {
            return (
              <AnimateIn key={card._id} delay={idx * 80}>
                <button type="button" onClick={() => setModalOpen(true)} className={`${cardClasses} text-left w-full`}>
                  {cardInner}
                </button>
              </AnimateIn>
            );
          }

          return (
            <AnimateIn key={card._id} delay={idx * 80}>
              <Link href={card.href} className={cardClasses}>
                {cardInner}
              </Link>
            </AnimateIn>
          );
        })}
      </div>

      <DocumentAnalysisModal open={modalOpen} onOpenChange={setModalOpen} locale={locale} />
    </section>
  );
}
```

- [ ] **Step 3: Use the new component from `page.tsx`**

In `src/app/page.tsx`, remove the now-unused `Link` import usage for this block (keep `Link` import if still used elsewhere in the file — check before removing the import statement itself) and replace the inline `{/* ── SERVICE CARDS ── */}` section (lines 159-216) with:

```tsx
      {/* ── SERVICE CARDS ── */}
      {sections.hero !== false && (
        <ServiceCards
          cards={allServiceCards}
          visibleHrefs={visibleHrefs}
          resolveIcon={resolveIcon}
          pick={pick}
          seedCardById={seedCardById}
          cardsHeading={cardsHeading}
          locale={locale}
          d={d}
        />
      )}
```

Add the import at the top of `src/app/page.tsx`:

```ts
import { ServiceCards } from "@/components/site/service-cards"
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. If `page.tsx` no longer uses `Link` anywhere else, remove the unused `import Link from "next/link"` line (check first — the hero/other sections may not use it, but verify by searching the file).

- [ ] **Step 5: Visual regression check**

Run: `npm run dev`, open `http://localhost:3000`. Confirm:
- The "AI ასისტენტი" (chat) and "შაბლონები" (templates) cards look and behave exactly as before (chat navigates to `/chat`; templates still shows "მალე"/coming-soon).
- The "დოკუმენტები" card now looks like an active card (not greyed out) and clicking it opens the modal instead of navigating.

- [ ] **Step 6: Commit**

```bash
git add src/lib/homepage-defaults.ts src/components/site/service-cards.tsx src/app/page.tsx
git commit -m "feat: wire homepage Documents card to open the analysis modal"
```

---

### Task 10: End-to-end verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1-9 if something breaks).

- [ ] **Step 1: Full lint pass**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 3: Manual flow — happy path**

Run: `npm run dev`. Log in as a real test user with `docReviewRemaining > 0` (check/set via the admin panel or directly in MongoDB if needed). From the homepage:
1. Click the "დოკუმენტები" card → modal opens (no page navigation, URL stays `/`).
2. Upload a small `.txt` file with obviously risky contract-like content (e.g. a paragraph with a one-sided termination clause and a large penalty fee) — click "გაანალიზება".
3. Confirm a loading spinner shows, then structured results render: summary, one or more risk cards with a category badge + severity badge + explanation + recommendation, and a general recommendations list.
4. Repeat with a real `.pdf` and a real `.docx` file (any real-world sample document you have on hand) — confirm extracted text produces sensible (non-garbled) analysis, not gibberish from a raw binary dump.

- [ ] **Step 4: Manual flow — error paths**

- No file selected: "გაანალიზება" button stays disabled.
- Select a `.zip` or other unsupported extension: inline "unsupported file type" error, no network request sent (check Network tab).
- Select a file over 10MB: inline "too large" error.
- Log out, reopen the modal, try to analyze: 401 → inline "please sign in" message with a working link to `/login`.
- Temporarily set the test user's `docReviewRemaining` to `0`, retry: 403 → inline "quota exceeded" message with a working link to `/pricing`. Restore the quota value afterward.

- [ ] **Step 5: Confirm untouched features still work**

- Visit `/chat`, ask a question, confirm the consultation flow is completely unaffected (streaming answer, citations, quota).
- Visit `/review` directly, run an analysis via the pasted-text flow, confirm it renders the new structured `RiskFindingCard` output correctly.
- Visit `/dashboard/reviews`: confirm any pre-existing (old-format) rows still render as plain bullet findings, and the new entries created during this testing render as full risk cards, in the same list without errors.

- [ ] **Step 6: Final commit (only if Step 3-5 required fixes)**

```bash
git add -A
git commit -m "fix: address issues found during document analysis end-to-end verification"
```

If no fixes were needed, skip this commit — the feature is already fully committed from Tasks 1-9.
