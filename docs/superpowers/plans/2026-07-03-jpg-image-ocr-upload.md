# JPG Multi-Image OCR Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user upload up to 10 JPG photos of a document into the existing Document Analysis modal; OCR them server-side, merge in order, and run the result through the unchanged analysis pipeline.

**Architecture:** Add an `extractTextFromImages` function (tesseract.js, bounded-concurrency scheduler) to the existing `document-analysis.ts` library, add a parallel `images` branch to `/api/review` that feeds into the exact same downstream analysis code the single-file branch already uses, and add a "Photos" mode to the existing modal component alongside its unchanged "Document" mode.

**Tech Stack:** Next.js 16 App Router, `tesseract.js` v7 (server-side OCR, Georgian `kat` language pack), reuses `callOpenRouterChat`, `DocumentReview` model, `RiskFindingCard` — all unchanged.

**Spec:** `docs/superpowers/specs/2026-07-03-jpg-image-ocr-upload-design.md`

## Global Constraints

- Max 10 images per analysis (`MAX_IMAGES`).
- Max 8MB per image (`MAX_IMAGE_BYTES`).
- Only `.jpg`/`.jpeg` accepted in Photos mode.
- Image order = selection order (no drag-reorder UI).
- OCR concurrency bounded to 3 workers at a time (`OCR_CONCURRENCY`), not fully sequential, not fully unbounded-parallel.
- One analysis (regardless of image count) consumes exactly 1 `docReviewRemaining` unit — same as today.
- If every image fails OCR: hard error, no `DocumentReview` saved, no quota decrement.
- If some (not all) images fail OCR: skip them, continue, surface `skippedImages` count in the response.
- Zero changes to `RiskFindingCard`, `/review` page, `/dashboard/reviews` — the API response shape for `summary`/`findings`/`recommendations` is unchanged; only one new optional field (`skippedImages`) is added.
- `/chat` and the existing Document-mode single-file flow must remain pixel-for-pixel unchanged.
- No test runner configured in this repo (per `CLAUDE.md`) — verification uses `npx tsc --noEmit`, `npm run lint`, and manual `npm run dev` exercises, same pattern as the previous Document Analysis plan.
- Georgian OCR quality via Tesseract's `kat` pack is a known, accepted limitation for v1.

---

### Task 1: OCR extraction function

**Files:**
- Modify: `package.json` (already has `"tesseract.js": "^7.0.0"` installed this session — confirm it's present, no action needed if so)
- Modify: `next.config.ts`
- Modify: `src/lib/legal/document-analysis.ts`

**Interfaces:**
- Produces: `MAX_IMAGES = 10`, `MAX_IMAGE_BYTES = 8 * 1024 * 1024`, `IMAGE_EXTENSIONS = ["jpg", "jpeg"] as const`, `isImageExtension(ext: string): boolean`, `OCR_CONCURRENCY = 3`, `extractTextFromImages(images: {name: string; buffer: Buffer}[]): Promise<{combinedText: string; succeededCount: number; failedCount: number}>` (throws `Error` if `succeededCount` would be 0).

- [ ] **Step 1: Confirm tesseract.js is installed**

Run: `grep tesseract.js package.json`
Expected: a line like `"tesseract.js": "^7.0.0"`. If missing, run `npm install tesseract.js`.

- [ ] **Step 2: Externalize tesseract.js from the Turbopack server bundle**

`pdf-parse` needed this in the previous feature (its worker file wasn't resolvable when bundled). `tesseract.js` has the same kind of dynamic worker/WASM loading, so add it preemptively — confirmed or removed in Task 5's verification if it turns out unnecessary.

In `next.config.ts`, change:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  serverExternalPackages: ["pdf-parse"],
};
```

to:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  serverExternalPackages: ["pdf-parse", "tesseract.js"],
};
```

- [ ] **Step 3: Add OCR extraction to the document-analysis library**

In `src/lib/legal/document-analysis.ts`, add the import at the top (after the existing `pdf-parse`/`mammoth` imports):

```ts
import { createScheduler, createWorker } from "tesseract.js";
```

Add these exports after the existing `SUPPORTED_EXTENSIONS`/`isSupportedExtension` block (after line 45, before `extractDocumentText`):

```ts
export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_EXTENSIONS = ["jpg", "jpeg"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

export function isImageExtension(ext: string): ext is ImageExtension {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export const OCR_CONCURRENCY = 3;

export async function extractTextFromImages(
  images: { name: string; buffer: Buffer }[]
): Promise<{ combinedText: string; succeededCount: number; failedCount: number }> {
  const poolSize = Math.min(OCR_CONCURRENCY, images.length);
  const scheduler = createScheduler();
  const workers = await Promise.all(
    Array.from({ length: poolSize }, () => createWorker("kat"))
  );
  workers.forEach((worker) => scheduler.addWorker(worker));

  const results: (string | null)[] = new Array(images.length).fill(null);
  try {
    await Promise.all(
      images.map(async (image, i) => {
        try {
          const { data } = await scheduler.addJob("recognize", image.buffer);
          results[i] = data.text;
        } catch {
          results[i] = null;
        }
      })
    );
  } finally {
    await scheduler.terminate();
  }

  const succeededCount = results.filter((text) => text !== null).length;
  const failedCount = images.length - succeededCount;

  if (succeededCount === 0) {
    throw new Error("All images failed OCR");
  }

  const combinedText = results
    .map((text, i) => (text === null ? null : `--- გვერდი ${i + 1} ---\n\n${text}`))
    .filter((chunk): chunk is string => chunk !== null)
    .join("\n\n");

  return { combinedText, succeededCount, failedCount };
}
```

Notes for the implementer:
- `scheduler.addJob("recognize", image.buffer)` returns `Promise<{ data: { text: string } }>` — `tesseract.js`'s `ImageLike` type accepts `Buffer` directly (confirmed by reading `node_modules/tesseract.js/src/index.d.ts`), no conversion needed.
- The page separator numbers use `i + 1` (position among *all* selected images, not just the successful ones) so a skipped page 2 doesn't relabel page 3 as page 2 — matches the spec's decision.
- `scheduler.terminate()` also terminates the workers added to it — no separate per-worker cleanup needed.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `document-analysis.ts` or `next.config.ts`.

- [ ] **Step 5: Commit**

```bash
git add next.config.ts src/lib/legal/document-analysis.ts package.json package-lock.json
git commit -m "feat: add server-side OCR extraction for multi-image documents"
```

---

### Task 2: `/api/review` images branch

**Files:**
- Modify: `src/app/api/review/route.ts`

**Interfaces:**
- Consumes: `MAX_IMAGES`, `MAX_IMAGE_BYTES`, `extensionOf`, `isImageExtension`, `extractTextFromImages` from Task 1.
- Produces: `POST /api/review` now also accepts `multipart/form-data` with one or more `images` fields (in addition to the existing single `file` field, unchanged). Success response gains one new optional field: `skippedImages?: number` (present and > 0 only when some images failed OCR). All other response fields/status codes for the existing single-file and pasted-text paths are unchanged.

- [ ] **Step 1: Add the images branch**

In `src/app/api/review/route.ts`, update the import block:

```ts
import {
  ANALYSIS_SYSTEM_PROMPT,
  MAX_ANALYSIS_TEXT,
  MAX_FILE_BYTES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  extensionOf,
  isSupportedExtension,
  isImageExtension,
  extractDocumentText,
  extractTextFromImages,
  parseAnalysisResponse,
} from "@/lib/legal/document-analysis";
```

Replace the `multipart/form-data` branch (lines 43-73):

```ts
  if (ct.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const images = formData.getAll("images") as File[];
    const pastedText = formData.get("text") as string | null;

    if (images.length > 0) {
      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Select at most ${MAX_IMAGES} images.` },
          { status: 400 }
        );
      }
      for (const image of images) {
        const ext = extensionOf(image.name);
        if (!isImageExtension(ext)) {
          return NextResponse.json(
            { error: "Unsupported image type. Use JPG." },
            { status: 400 }
          );
        }
        if (image.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: "One or more images are too large (max 8MB each)." },
            { status: 400 }
          );
        }
      }
      fileName = `${images.length} ფოტოს დოკუმენტი`;
      let ocr: { combinedText: string; succeededCount: number; failedCount: number };
      try {
        ocr = await extractTextFromImages(
          await Promise.all(
            images.map(async (image) => ({
              name: image.name,
              buffer: Buffer.from(await image.arrayBuffer()),
            }))
          )
        );
      } catch (err) {
        return NextResponse.json(
          {
            error: "Could not read any of the uploaded images",
            detail: String(err instanceof Error ? err.message : err),
          },
          { status: 400 }
        );
      }
      text = ocr.combinedText;
      skippedImages = ocr.failedCount;
    } else if (file && file.size > 0) {
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
```

Add `let skippedImages = 0;` next to the existing `let text = ""; let fileName = "document";` declarations (near the top of the function body, right after the quota check).

Update the success response at the end of the function:

```ts
  return NextResponse.json(
    {
      id: String((review as { _id: unknown })._id),
      fileName,
      summary: analysis.summary,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
      ...(skippedImages > 0 ? { skippedImages } : {}),
    },
    { status: 201 }
  );
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `api/review/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/review/route.ts
git commit -m "feat: accept multi-image JPG uploads in /api/review"
```

---

### Task 3: i18n strings for Photos mode

**Files:**
- Modify: `src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Produces: 7 new keys inside the existing `documentAnalysis` section (both `ka` and `en`): `modeDocumentLabel`, `modePhotosLabel`, `dropzoneHintPhotos`, `addMoreLabel`, `maxImagesNotice`, `noImagesError`, `unsupportedImageTypeError`, `skippedImagesNote`.

- [ ] **Step 1: Add the `ka` keys**

In `src/lib/i18n/dictionaries.ts`, inside the `ka.documentAnalysis` object, add these keys (anywhere inside the object, e.g. right after `dropzoneHint`):

```ts
    modeDocumentLabel: "დოკუმენტი",
    modePhotosLabel: "ფოტოები",
    dropzoneHintPhotos: "აირჩიეთ სურათები — JPG, მაქს. 10",
    addMoreLabel: "მეტის დამატება",
    maxImagesNotice: "მაქსიმუმ 10 სურათი",
    noImagesError: "ატვირთეთ სულ მცირე ერთი სურათი",
    unsupportedImageTypeError: "მხარდაუჭერელი სურათის ტიპი — მხოლოდ JPG",
    skippedImagesNote: "ზოგიერთი სურათი ვერ წაიკითხა და გამოტოვებულია",
```

- [ ] **Step 2: Add the matching `en` keys**

In the `en.documentAnalysis` object, add:

```ts
    modeDocumentLabel: "Document",
    modePhotosLabel: "Photos",
    dropzoneHintPhotos: "Choose photos — JPG, max 10",
    addMoreLabel: "Add more",
    maxImagesNotice: "Maximum 10 images",
    noImagesError: "Upload at least one image",
    unsupportedImageTypeError: "Unsupported image type — JPG only",
    skippedImagesNote: "Some images could not be read and were skipped",
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — the `Dict` type is inferred from `ka`, so a missing key in `en` fails typecheck.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/dictionaries.ts
git commit -m "feat: add i18n strings for Photos upload mode"
```

---

### Task 4: Modal UI — Photos mode

**Files:**
- Modify: `src/components/site/document-analysis-modal.tsx`

**Interfaces:**
- Consumes: i18n keys from Task 3, unchanged `RiskFindingCard`.
- Produces: `DocumentAnalysisModal` unchanged public props (`open`, `onOpenChange`, `locale`); internally adds a Document/Photos mode toggle. Document mode behavior is byte-for-byte unchanged from before this task.

- [ ] **Step 1: Replace the full file contents**

Replace the entire contents of `src/components/site/document-analysis-modal.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { FileUp, Image as ImageIcon, Loader2, Plus, Sparkles, AlertCircle, X as XIcon } from "lucide-react";
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

const IMAGE_ACCEPT = ".jpg,.jpeg";
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_SUPPORTED = ["jpg", "jpeg"];

type AnalysisResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
  skippedImages?: number;
};

type Status = "idle" | "ready" | "analyzing" | "results" | "error";
type Mode = "document" | "photos";
type ImageItem = { file: File; url: string };

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
  const [mode, setMode] = useState<Mode>("document");
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [errorKind, setErrorKind] = useState<
    "unsupported" | "tooLarge" | "unauthorized" | "quota" | "generic" | "unsupportedImage" | "noImages" | null
  >(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  function clearImages() {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.url));
      return [];
    });
  }

  function reset() {
    setMode("document");
    setStatus("idle");
    setFile(null);
    clearImages();
    setErrorKind(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setFile(null);
    clearImages();
    setStatus("idle");
    setErrorKind(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
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

  function handleImagesPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    if (picked.some((f) => !IMAGE_SUPPORTED.includes(extOf(f.name)))) {
      setErrorKind("unsupportedImage");
      setStatus("error");
      return;
    }
    if (picked.some((f) => f.size > MAX_IMAGE_BYTES)) {
      setErrorKind("tooLarge");
      setStatus("error");
      return;
    }
    setImages((prev) => {
      const room = Math.max(MAX_IMAGES - prev.length, 0);
      const accepted = picked.slice(0, room).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
      return [...prev, ...accepted];
    });
    setErrorKind(null);
    setStatus("ready");
    if (imagesRef.current) imagesRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStatus("idle");
      return next;
    });
  }

  async function analyze() {
    if (mode === "document" && !file) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    if (mode === "photos" && images.length === 0) {
      setErrorKind("noImages");
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    setErrorKind(null);
    try {
      const formData = new FormData();
      if (mode === "document" && file) {
        formData.append("file", file);
      } else {
        images.forEach((img) => formData.append("images", img.file));
      }
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

  const analyzeDisabled = mode === "document" ? !file : images.length === 0;

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
            <div className="flex rounded-lg border border-border p-1 gap-1">
              <button
                type="button"
                onClick={() => switchMode("document")}
                className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  mode === "document"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.modeDocumentLabel}
              </button>
              <button
                type="button"
                onClick={() => switchMode("photos")}
                className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  mode === "photos"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.modePhotosLabel}
              </button>
            </div>

            {mode === "document" ? (
              <>
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
              </>
            ) : (
              <>
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, i) => (
                      <div
                        key={img.url}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => imagesRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        aria-label={t.addMoreLabel}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imagesRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center gap-2 text-center"
                  >
                    <ImageIcon className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium text-foreground">{t.dropzoneHintPhotos}</p>
                    <span className="text-xs text-muted-foreground">{t.chooseFile}</span>
                  </button>
                )}
                <input
                  ref={imagesRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleImagesPick}
                />
                {images.length >= MAX_IMAGES && (
                  <p className="text-xs text-muted-foreground text-center">{t.maxImagesNotice}</p>
                )}
              </>
            )}

            <Button onClick={analyze} disabled={analyzeDisabled} className="w-full">
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
                {errorKind === "unsupportedImage" && t.unsupportedImageTypeError}
                {errorKind === "noImages" && t.noImagesError}
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
            {(errorKind === "generic" ||
              errorKind === "unsupported" ||
              errorKind === "tooLarge" ||
              errorKind === "unsupportedImage" ||
              errorKind === "noImages") && (
              <Button variant="outline" className="w-full" onClick={reset}>
                {t.retryCta}
              </Button>
            )}
          </div>
        )}

        {status === "results" && result && (
          <div className="space-y-4">
            {typeof result.skippedImages === "number" && result.skippedImages > 0 && (
              <p className="text-xs rounded-lg border border-border bg-muted/50 p-2 text-muted-foreground">
                {t.skippedImagesNote} ({result.skippedImages})
              </p>
            )}

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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `document-analysis-modal.tsx`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors (the inline `<img>` needs the same `eslint-disable-next-line @next/next/no-img-element` comment already used elsewhere in this codebase, e.g. `src/app/page.tsx` — it's included above).

- [ ] **Step 4: Commit**

```bash
git add src/components/site/document-analysis-modal.tsx
git commit -m "feat: add Photos mode (multi-JPG upload) to document analysis modal"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only; fix forward in the relevant file from Tasks 1-4 if something breaks).

- [ ] **Step 1: Full lint + typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors anywhere in the project.

- [ ] **Step 2: Restart the dev server**

Both `next.config.ts` (Task 1) and the Mongoose-adjacent nature of this change mean a full restart (not hot-reload) is needed, same lesson as the previous feature:

```bash
# find and kill whatever is listening on :3000, then:
npm run dev
```

- [ ] **Step 3: Manual flow — Photos mode happy path**

Log in as a real (or throwaway, cleaned up after) test user with `docReviewRemaining > 0`. From the homepage, open the Documents card modal, switch to "ფოტოები" (Photos), select 2-3 real JPG photos of a short document with obviously risky clauses (or synthesize simple text-on-white-background JPGs), confirm:
- Thumbnails appear in selection order with visible page-number badges (1, 2, 3…).
- "Add more" tile appears while under 10 images; selecting an 11th image is prevented (test by trying to add more than 10 across multiple picks).
- Removing a thumbnail updates the remaining numbering visually (positions shift) and doesn't break analysis.
- Clicking analyze shows the loading state, then structured results identical in presentation to the Document-mode results (same `RiskFindingCard` rendering).

- [ ] **Step 4: Manual flow — partial OCR failure**

Upload a mix of 1 valid JPG (real photo/text) + 1 corrupted/non-image file renamed to `.jpg` (e.g. a text file renamed to `broken.jpg`) — confirm:
- Analysis still completes using the valid image's text.
- Response includes `skippedImages: 1` and the modal shows the "some images could not be read" notice with count `(1)`.

- [ ] **Step 5: Manual flow — total OCR failure**

Upload only corrupted/non-image files renamed to `.jpg` — confirm:
- Request fails (400), no `DocumentReview` is created (check `/dashboard/reviews` count before/after), quota (`docReviewRemaining`) is unchanged before/after (check via a small Mongo query or the profile page usage display).

- [ ] **Step 6: Manual flow — mode switching and Document-mode regression**

- Switch from Photos (with images selected) back to Document mode — confirm images are cleared and the toggle UI doesn't leak state between modes.
- Run one full Document-mode (PDF or TXT) analysis exactly as before this feature — confirm it behaves identically to how it worked before Task 4 (same UI, same request shape, same result rendering).

- [ ] **Step 7: Confirm untouched surfaces**

- `/chat` still works exactly as before (unaffected by this feature).
- `/review` page and `/dashboard/reviews` still render correctly for both old (pre-existing) and newly created analyses (image-sourced analyses appear with their synthesized `fileName` like "3 ფოტოს დოკუმენტი").

- [ ] **Step 8: Final commit (only if Steps 3-7 required fixes)**

```bash
git add -A
git commit -m "fix: address issues found during JPG OCR upload end-to-end verification"
```

If no fixes were needed, skip this commit.
