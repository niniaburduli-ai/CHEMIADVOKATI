# Document Generation Split-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/generate` into a split-screen workspace — structured per-type questions on the left, a live/editable/bold-aware document preview with fullscreen check on the right.

**Architecture:** Backend gets two small, independent additions (a prompt tweak, a new PATCH route) that don't change the existing POST contract. The frontend (`generate-client.tsx`) is rewritten in three layers: first the split-screen layout + structured question fields (still simple read-only output), then bold-rendering + word count, then edit-mode + autosave, then a fullscreen preview modal — each layer independently testable without depending on the next layer existing yet.

**Tech Stack:** Next.js 16 App Router (Client + Route Handler), React 19, TypeScript strict, Tailwind v4, shadcn/ui (`Dialog`, `Card`, `Textarea`, `Input`, `Button`), zod, lucide-react.

## Global Constraints

- No test runner configured — verify every task with `npm run lint`, `npx tsc --noEmit`, and a manual dev-server check.
- The 6 fixed document types and `GenerateDocSchema`'s `{ type, details }` POST contract do not change.
- No AI-generated (dynamic) questions — question schema is hardcoded per type in the frontend.
- No full WYSIWYG contentEditable — edit mode is a plain `Textarea` on raw text.
- No i18n dictionary migration for this page — stays hardcoded Georgian strings, matching its current convention.
- Reuse `renderMarkdownBold` from `@/lib/markdown-bold` (already exists) — do not reimplement bold parsing.
- Dynamic route params are async in this Next.js version — `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params;` (see `src/app/api/admin/users/[id]/route.ts:12-19` for the established pattern in this codebase).

---

### Task 1: AI prompt — bold key data, compact spacing

**Files:**
- Modify: `src/app/api/generate/route.ts:13-17`

**Interfaces:**
- No signature changes. `SYSTEM` stays a `string` constant used the same way at line 60 (unchanged).

- [ ] **Step 1: Update the `SYSTEM` prompt**

Replace:

```ts
const SYSTEM = `შენ ხარ ქართული იურიდიული დოკუმენტების გენერატორი.
შექმენი სრული, პროფესიონალური ქართული იურიდიული დოკუმენტი მომხმარებლის აღწერილობის მიხედვით.
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
სადაც კონკრეტული ინფორმაცია საჭიროა (სახელები, თარიღები, თანხები, პირადი ნომრები), მიუთითე [ბრეკეტებში].
დოკუმენტი უნდა იყოს სრული, სტრუქტურირებული და გამოყენებადი შაბლონი.`;
```

with:

```ts
const SYSTEM = `შენ ხარ ქართული იურიდიული დოკუმენტების გენერატორი.
შექმენი სრული, პროფესიონალური ქართული იურიდიული დოკუმენტი მომხმარებლის აღწერილობის მიხედვით.
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
მნიშვნელოვანი მონაცემები (სახელები, თარიღები, თანხები, პირადი ნომრები), რომლებიც მომხმარებელმა მიუთითა, გამოკვეთე **მუქი შრიფტით** (markdown-ის ** სინტაქსით).
თუ კონკრეტული მონაცემი უცნობია და მომხმარებელს არ მიუთითებია, დატოვე [ბრეკეტებში].
დოკუმენტი უნდა იყოს კომპაქტური: სექციებს შორის მაქსიმუმ ერთი ცარიელი ხაზი, ზედმეტი დაშორებების გარეშე.
დოკუმენტი უნდა იყოს სრული, სტრუქტურირებული და გამოყენებადი შაბლონი.`;
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, sign in, visit `/generate`, generate any document type with real details. Confirm the response contains `**bold**` markers around names/dates/amounts the user supplied, and that consecutive blank lines in the output are rare (at most one blank line between sections). This is a model-behavior check, not a hard guarantee — the model may not comply 100% of the time; confirm the instruction is at least being followed most of the time, don't block on perfect compliance.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/generate/route.ts
git commit -m "feat: prompt AI to bold key data and keep spacing compact in generated docs"
```

---

### Task 2: PATCH /api/generate/[id] — persist edits

**Files:**
- Modify: `src/lib/validators.ts` (add a new schema near `GenerateDocSchema`, currently at lines 79-90)
- Create: `src/app/api/generate/[id]/route.ts`

**Interfaces:**
- Produces: `UpdateGeneratedDocSchema` (zod schema, `{ content: string }`, exported from `src/lib/validators.ts`) and `PATCH` handler at `/api/generate/[id]` — the frontend (Task 5) calls `fetch(`/api/generate/${id}`, { method: "PATCH", body: JSON.stringify({ content }) })` and expects `{ id, title, content }` back on success.

- [ ] **Step 1: Add the validator**

In `src/lib/validators.ts`, immediately after the existing `GenerateDocSchema` block (after line 90, `export type GenerateDocInput = z.infer<typeof GenerateDocSchema>;`), add:

```ts

export const UpdateGeneratedDocSchema = z.object({
  content: z.string().min(1).max(20000),
});
export type UpdateGeneratedDocInput = z.infer<typeof UpdateGeneratedDocSchema>;
```

- [ ] **Step 2: Create the route**

Create `src/app/api/generate/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { UpdateGeneratedDocSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateGeneratedDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  const doc = await GeneratedDocument.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (String(doc.userId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  doc.content = parsed.data.content;
  await doc.save();

  return NextResponse.json({ id: String(doc._id), title: doc.title, content: doc.content });
}
```

- [ ] **Step 3: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

With the dev server running and a real session cookie (sign in via the browser first, or reuse a session), generate one document via `/generate` to get a real `id`, then:

```bash
curl -X PATCH http://localhost:3000/api/generate/<id> \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your session cookie>" \
  -d '{"content":"changed content"}'
```

Expected: `200` with `{"id":"...","title":"...","content":"changed content"}`. Then confirm via `/dashboard/documents` (or a direct DB read) that the stored `content` actually changed. Also confirm a request with someone else's document `id` (or without the cookie) returns `403`/`401`, and a malformed `id` (e.g. `abc`) returns `400`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators.ts src/app/api/generate/[id]/route.ts
git commit -m "feat: add PATCH /api/generate/[id] to persist document edits"
```

---

### Task 3: Split-screen layout + structured per-type questions

**Files:**
- Modify: `src/app/generate/generate-client.tsx` (full rewrite)

**Interfaces:**
- Produces: `QUESTION_SCHEMAS: Record<string, QuestionField[]>` and `type QuestionField = { key: string; label: string; type: "text" | "textarea" | "date" }`, both module-level in this file — Tasks 4-6 add to this same file and rely on the `result`/`type`/`answers`/`extra` state variables defined here.
- Consumes: existing `POST /api/generate` contract (unchanged).

- [ ] **Step 1: Replace the full file**

Replace the entire contents of `src/app/generate/generate-client.tsx` with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const DOC_TYPES = [
  { value: "complaint", label: "საჩივარი" },
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "demand-letter", label: "სამართლებრივი მოთხოვნა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

type FieldType = "text" | "textarea" | "date";
type QuestionField = { key: string; label: string; type: FieldType };

const QUESTION_SCHEMAS: Record<string, QuestionField[]> = {
  complaint: [
    { key: "respondent", label: "ვის ეხება საჩივარი", type: "text" },
    { key: "yourName", label: "შენი სახელი და გვარი", type: "text" },
    { key: "amount", label: "თანხა/ზიანი (ასეთის არსებობისას)", type: "text" },
    { key: "incidentDate", label: "მოვლენის თარიღი", type: "date" },
  ],
  "rental-agreement": [
    { key: "landlord", label: "გამქირავებელი", type: "text" },
    { key: "tenant", label: "დამქირავებელი", type: "text" },
    { key: "address", label: "ბინის მისამართი", type: "text" },
    { key: "rent", label: "ქირის ოდენობა", type: "text" },
    { key: "duration", label: "ხელშეკრულების ვადა", type: "text" },
  ],
  "employment-contract": [
    { key: "employer", label: "დამსაქმებელი", type: "text" },
    { key: "employee", label: "თანამშრომელი", type: "text" },
    { key: "position", label: "პოზიცია", type: "text" },
    { key: "salary", label: "ხელფასი", type: "text" },
    { key: "startDate", label: "დაწყების თარიღი", type: "date" },
  ],
  "power-of-attorney": [
    { key: "principal", label: "მინდობელი", type: "text" },
    { key: "agent", label: "მინდობილი პირი", type: "text" },
    { key: "scope", label: "მინდობის ფარგლები", type: "textarea" },
    { key: "idNumber", label: "პირადი ნომერი", type: "text" },
  ],
  "demand-letter": [
    { key: "recipient", label: "ადრესატი", type: "text" },
    { key: "amount", label: "მოთხოვნილი თანხა", type: "text" },
    { key: "reason", label: "მოთხოვნის საფუძველი", type: "textarea" },
    { key: "deadline", label: "ვადა", type: "text" },
  ],
  "termination-notice": [
    { key: "employer", label: "დამსაქმებელი", type: "text" },
    { key: "employee", label: "თანამშრომელი", type: "text" },
    { key: "reason", label: "საფუძველი", type: "text" },
    { key: "lastDay", label: "ბოლო სამუშაო დღე", type: "date" },
  ],
};

export function GenerateClient() {
  const [type, setType] = useState("complaint");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = QUESTION_SCHEMAS[type] ?? [];

  function buildDetails(): string {
    const lines = fields
      .map((f) => (answers[f.key]?.trim() ? `${f.label}: ${answers[f.key].trim()}` : null))
      .filter((line): line is string => line !== null);
    if (extra.trim()) lines.push(extra.trim());
    return lines.join("\n");
  }

  const details = buildDetails();

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function generate() {
    if (details.trim().length < 10) {
      toast.error("შეავსე მინიმუმ ერთი ველი დეტალური ინფორმაციით");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "შეცდომა");
        return;
      }
      setResult(data);
      toast.success("დოკუმენტი შეიქმნა");
    } catch {
      setError("სერვისთან კავშირი ვერ დამყარდა");
    } finally {
      setLoading(false);
    }
  }

  function downloadTxt() {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast.success("კოპირებულია");
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> დოკუმენტის გენერაცია
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI ქმნის სრულ ქართულ იურიდიულ დოკუმენტს
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">დოკუმენტის ტიპი და დეტალები</CardTitle>
            <CardDescription>
              აირჩიე ტიპი და შეავსე ცნობილი დეტალები
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">დოკუმენტის ტიპი</Label>
              <select
                id="doc-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setAnswers({});
                  setExtra("");
                  setResult(null);
                }}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={`field-${f.key}`}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    type={f.type}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="extra">დამატებითი დეტალები</Label>
              <Textarea
                id="extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="დაამატე ნებისმიერი სხვა მნიშვნელოვანი დეტალი"
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">{details.length} / 2000 სიმბოლო</p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  იქმნება...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  შექმენი დოკუმენტი
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <CardDescription>
                    დოკუმენტი შეიქმნა და შენახულია ანგარიშში
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copy}>
                    <Copy className="h-4 w-4 mr-1" /> კოპირება
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                {result.content}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px] border-dashed">
            <CardContent className="text-center text-muted-foreground text-sm py-12">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი“
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, visit `/generate`. Confirm: left column is a sticky form with the type dropdown followed by that type's specific fields (e.g. picking "მინდობილობა" shows "მინდობელი"/"მინდობილი პირი"/"მინდობის ფარგლები"/"პირადი ნომერი" instead of one big textarea), an "დამატებითი დეტალები" box, and a character counter. Right column shows a dashed empty-state placeholder before generating, and the same-as-before result card after generating. Switching document type resets the fields and clears any existing result. Generating with only 1-2 fields filled in still works (as long as the joined details string is at least 10 characters) and calls the same `/api/generate` endpoint as before.

- [ ] **Step 4: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: split-screen layout with structured per-type questions on /generate"
```

---

### Task 4: Bold rendering, compact spacing, word count

**Files:**
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- Consumes: `renderMarkdownBold(text: string): ReactNode[]` from `@/lib/markdown-bold` (already exists in the codebase, do not redefine it).
- Produces: `normalizeSpacing(text: string): string`, a module-level helper other tasks in this file can reuse (Task 6's preview modal uses it too).

- [ ] **Step 1: Add the import and helper**

Add this import alongside the existing ones (after the `toast` import):

```tsx
import { renderMarkdownBold } from "@/lib/markdown-bold";
```

Add this helper function above `export function GenerateClient()`:

```tsx
function normalizeSpacing(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}
```

- [ ] **Step 2: Compute word count and show it, replace the `<pre>` block**

Inside `GenerateClient`, after the `const details = buildDetails();` line, add:

```tsx
  const wordCount = result ? result.content.trim().split(/\s+/).filter(Boolean).length : 0;
```

Replace:

```tsx
                  <CardDescription>
                    დოკუმენტი შეიქმნა და შენახულია ანგარიშში
                  </CardDescription>
```

with:

```tsx
                  <CardDescription>
                    დოკუმენტი შეიქმნა და შენახულია ანგარიშში · {wordCount} სიტყვა
                  </CardDescription>
```

Replace:

```tsx
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                {result.content}
              </pre>
            </CardContent>
```

with:

```tsx
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                {renderMarkdownBold(normalizeSpacing(result.content))}
              </div>
            </CardContent>
```

- [ ] **Step 3: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

Generate a document (Task 1's prompt change should make the model emit `**bold**` around key data). Confirm bold text renders as actual bold (`<strong>`), not literal asterisks. Confirm the word count next to the title looks reasonable (roughly matches a manual word count of the visible text). If the model happens to emit 3+ consecutive blank lines, confirm they collapse to a single blank line in the rendered view.

- [ ] **Step 5: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: render bold markdown and word count in generated document preview"
```

---

### Task 5: Edit mode with autosave

**Files:**
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- Consumes: `PATCH /api/generate/[id]` from Task 2 (`{ content: string }` request body, `{ id, title, content }` response).
- Produces: `editing`, `saving` state and `saveContent`/`scheduleSave` functions — Task 6 does not depend on these, but must not remove them.

- [ ] **Step 1: Add imports and state**

Change the icon import line from:

```tsx
import { FileText, Download, Copy, ArrowLeft, Loader2 } from "lucide-react";
```

to:

```tsx
import { FileText, Download, Copy, ArrowLeft, Loader2, Pencil, Eye } from "lucide-react";
```

Change:

```tsx
import { useState } from "react";
```

to:

```tsx
import { useRef, useState } from "react";
```

Inside `GenerateClient`, after the existing `const [error, setError] = useState<string | null>(null);` line, add:

```tsx
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 2: Add save functions**

After the existing `function copy() { ... }` block, add:

```tsx

  async function saveContent(newContent: string) {
    if (!result) return;
    setSaving(true);
    try {
      await fetch(`/api/generate/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
    } catch {
      toast.error("ცვლილება ვერ შენახულა");
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(newContent: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(newContent), 1000);
  }
```

- [ ] **Step 3: Add the edit toggle button and swap the content area**

Replace:

```tsx
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copy}>
                    <Copy className="h-4 w-4 mr-1" /> კოპირება
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                </div>
```

with:

```tsx
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
                    {editing ? (
                      <><Eye className="h-4 w-4 mr-1" /> მზა ტექსტი</>
                    ) : (
                      <><Pencil className="h-4 w-4 mr-1" /> რედაქტირება</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copy}>
                    <Copy className="h-4 w-4 mr-1" /> კოპირება
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                </div>
```

Replace:

```tsx
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                {renderMarkdownBold(normalizeSpacing(result.content))}
              </div>
            </CardContent>
```

with:

```tsx
            <CardContent>
              {editing ? (
                <Textarea
                  value={result.content}
                  onChange={(e) => {
                    const next = e.target.value;
                    setResult((prev) => (prev ? { ...prev, content: next } : prev));
                    scheduleSave(next);
                  }}
                  onBlur={() => {
                    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                    saveContent(result.content);
                  }}
                  className="min-h-[70vh] font-mono text-sm"
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                  {renderMarkdownBold(normalizeSpacing(result.content))}
                </div>
              )}
              {saving && <p className="text-xs text-muted-foreground mt-2">ინახება...</p>}
            </CardContent>
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Generate a document. Click "რედაქტირება" — confirm the panel switches to a plain textarea showing the raw text (including any `**` markers). Type a change, wait ~1.5s without typing, confirm a brief "ინახება..." appears and disappears. Reload the page (navigate away and back to `/generate` — note this clears the client-side `result` state since it's not persisted in the URL, so instead verify persistence via `/dashboard/documents`: after editing, open `/dashboard/documents` in a new tab and confirm the edited content shows there, not the original AI draft). Click "მზა ტექსტი" to switch back to rendered view and confirm your edit is reflected there too (bold still renders correctly if you edited near a `**` marker).

- [ ] **Step 6: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: add editable raw-text mode with autosave to generated document panel"
```

---

### Task 6: Fullscreen preview modal

**Files:**
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog` (already exists, same component used in `src/components/site/document-analysis-modal.tsx`); `normalizeSpacing` and `renderMarkdownBold` from Task 4.

- [ ] **Step 1: Add imports and state**

Change:

```tsx
import { FileText, Download, Copy, ArrowLeft, Loader2, Pencil, Eye } from "lucide-react";
```

to:

```tsx
import { FileText, Download, Copy, ArrowLeft, Loader2, Pencil, Eye, Maximize2 } from "lucide-react";
```

Add this import after the `renderMarkdownBold` import:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
```

Inside `GenerateClient`, after the `const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);` line, add:

```tsx
  const [previewOpen, setPreviewOpen] = useState(false);
```

- [ ] **Step 2: Add the Preview button**

Replace:

```tsx
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                </div>
```

with:

```tsx
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                    <Maximize2 className="h-4 w-4 mr-1" /> სრულ ეკრანზე
                  </Button>
                </div>
```

- [ ] **Step 3: Add the Dialog**

Replace the closing of the component's returned JSX. Find:

```tsx
        )}
      </div>
    </div>
  );
}
```

and replace with:

```tsx
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-y-auto">
          {result && (
            <>
              <DialogHeader>
                <DialogTitle>{result.title}</DialogTitle>
              </DialogHeader>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderMarkdownBold(normalizeSpacing(result.content))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={downloadTxt}>
                  <Download className="h-4 w-4 mr-1" /> .txt
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Generate a document, click "სრულ ეკრანზე" — confirm a large modal opens showing the rendered (bold, compact-spaced) document read-only, with a working `.txt` download button. Close it (X button or backdrop click) and confirm the underlying page is unaffected (editing state, content, etc. all still intact).

- [ ] **Step 6: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: add fullscreen preview modal to /generate"
```

---

## Execution Order

Tasks 1 and 2 are independent of each other and of Task 3 (backend only). Tasks 3 → 4 → 5 → 6 must run in that order — each modifies the same file and depends on state/helpers the previous task introduced (Task 4 needs Task 3's `result` state and JSX structure to exist; Task 5 needs Task 4's content-rendering block to swap out; Task 6 needs Task 4's `normalizeSpacing`/`renderMarkdownBold` usage and Task 5's button row). Recommended order: 1, 2, 3, 4, 5, 6 (1 and 2 can run in parallel with each other, but finish both before starting 3 so Task 5 has the PATCH route ready to call).
