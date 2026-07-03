# JPG Multi-Image OCR Upload — Design

Date: 2026-07-03

## Goal

Extend the Document Analysis feature (built in [2026-07-03-document-analysis-modal-design.md](2026-07-03-document-analysis-modal-design.md)) so a user can upload up to 10 JPG photos of a document instead of a single PDF/DOCX/TXT/MD file. The photos are OCR'd, merged into one text document in upload order, and fed into the *existing* analysis pipeline unchanged — same AI prompt, same structured risk output, same `RiskFindingCard` UI, same quota accounting (1 analysis = 1 `docReviewRemaining` unit, regardless of image count).

## Decisions (confirmed with user)

1. **OCR engine:** `tesseract.js`, server-side, Georgian (`kat`) language pack. No new API key/billing. Known limitation: Tesseract's Georgian OCR is meaningfully less accurate than a cloud OCR API or Tesseract's English OCR — accepted for v1.
2. **Upload UX:** the existing modal (`document-analysis-modal.tsx`) gains a two-mode toggle — "Document" (today's single-file flow, untouched) vs. "Photos" (new). No mixing file types in one analysis.
3. **Image ordering:** selection order only, no drag-to-reorder UI. Each thumbnail shows a visible page number (1, 2, 3…). Removing and re-adding is how a user fixes ordering.
4. **Per-image OCR failure:** skip the failed image, continue with the rest, surface a warning in the response/UI naming how many were skipped.
5. **All-images-fail case:** stop entirely, return an error, do not save a `DocumentReview`, do not consume quota — same "fail closed, don't charge the user" pattern the AI-failure and AI-unparseable-response paths already use in `/api/review`.
6. **Performance:** bounded-concurrency OCR (a small worker pool, not fully sequential, not fully unbounded-parallel) — full parallelism of up to 10 Tesseract workers risks CPU/memory spikes; full sequential is slow. A pool size of 3 is the starting default.

## Backend changes

### `src/lib/legal/document-analysis.ts`

New exports:

```ts
export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB per photo
export const IMAGE_EXTENSIONS = ["jpg", "jpeg"] as const;
export const OCR_CONCURRENCY = 3;

export interface ImageOcrResult {
  index: number;       // original selection order, 0-based
  text: string | null; // null if this image's OCR failed
}

export async function extractTextFromImages(
  images: { name: string; buffer: Buffer }[]
): Promise<{ combinedText: string; failedCount: number; succeededCount: number }>
```

`extractTextFromImages`:
- Runs OCR (`tesseract.js`, `createWorker('kat')`, `worker.recognize(buffer)`, `worker.terminate()`) across the `images` array using a small worker pool (`OCR_CONCURRENCY`) so at most 3 run at once, not all 10 simultaneously and not one-at-a-time.
- Preserves the original array order when reassembling text — a page's OCR result being slower than another's must not reorder the merged document. Each result carries its original `index`.
- Wraps each image's OCR call in try/catch; failures record `text: null` for that index and are counted, not thrown.
- Merges successful pages in original order into one string, separated by `\n\n--- გვერდი N ---\n\n` (N = 1-based page number, using the position among *all* selected images, not just the succeeded ones, so a skipped page 2 doesn't relabel page 3 as page 2).
- If `succeededCount === 0`, throws (caller turns this into the "all failed" error response).
- Exact `tesseract.js` v7 worker creation/recognize/terminate API to be confirmed by reading `node_modules/tesseract.js` at implementation time — training-data knowledge of this library may be stale (same caveat that applied to `pdf-parse` v2 during the previous feature).

### `src/app/api/review/route.ts`

New branch in the existing `multipart/form-data` handling: if the request has one or more `images` fields (`formData.getAll("images")`) instead of a single `file` field, take the images path instead of the existing single-file path:

- Validate: 1–10 images present (else 400 "select 1 to 10 images"), every file has extension `jpg`/`jpeg` (else 400 "unsupported file type" — matches existing wording style), every file ≤ `MAX_IMAGE_BYTES` (else 400 "file too large").
- Call `extractTextFromImages`. If it throws (all failed), return 400/502 (matching the existing "could not read document contents" wording) — no `DocumentReview` created, no quota decrement, consistent with decision 5.
- On partial success, proceed with `combinedText` through the *exact same* downstream code already in the route: truncate to `MAX_ANALYSIS_TEXT`, call `ANALYSIS_SYSTEM_PROMPT` + `callOpenRouterChat`, `parseAnalysisResponse`, `DocumentReview.create`, quota decrement — zero duplication, this is the same code path the single-file branch already uses today.
- `fileName` stored/returned for an image-batch analysis: synthesized as `"${succeededCount} ფოტოს დოკუმენტი"` (e.g. "3 ფოტოს დოკუმენტი") since there's no single meaningful file name for a multi-image batch.
- Success response gains one new optional field: `skippedImages?: number` (only present and > 0 when some images failed OCR) — this is the only response-shape change; `summary`/`findings`/`recommendations` are unchanged, so `RiskFindingCard` and every existing consumer (`/review` page, `/dashboard/reviews`) need zero changes, per the "maintain compatibility" requirement.

## Frontend changes

### `src/components/site/document-analysis-modal.tsx`

- Add a two-option toggle at the top of the idle/ready state: "დოკუმენტი" (Document, existing flow) / "ფოტოები" (Photos, new). Switching modes resets any in-progress selection.
- Photos mode: `<input type="file" accept=".jpg,.jpeg" multiple>`. Selecting files appends to an ordered array (capped at `MAX_IMAGES`; attempting to exceed it shows an inline "max 10 images" notice and ignores the extra files). Renders a thumbnail grid — each thumbnail shows the image preview (`URL.createObjectURL`), a page-number badge (1, 2, 3…), and a remove (×) button. An "Add more" tile appears while under the 10-image cap.
- Analyze button disabled until ≥1 image is selected (Photos mode) or a file is chosen (Document mode) — same disabled-state pattern as today, just gated on the active mode's data.
- On analyze in Photos mode: builds `FormData` with repeated `formData.append("images", file)` calls, one per image, in array order (`FormData` preserves append order, and the server reads them back in that same order via `getAll`).
- Results state: if the response includes `skippedImages > 0`, show a small inline notice above the summary (e.g. "1 სურათი ვერ წაიკითხა და გამოტოვებულია" / "1 image could not be read and was skipped") — the only new UI in the results view; the risk findings/recommendations rendering below it is 100% unchanged, reusing `RiskFindingCard` exactly as today.

### i18n (`src/lib/i18n/dictionaries.ts`)

New keys under the existing `documentAnalysis` section (both `ka`/`en`): mode toggle labels ("Document"/"Photos"), "add more" label, max-images-reached notice, skipped-images notice template, images-required error (Photos mode equivalent of `noFileError`).

## Non-goals / explicitly out of scope

- No drag-to-reorder UI (decision 3).
- No cloud OCR fallback for low-confidence results — pure `tesseract.js` only for v1.
- No changes to `RiskFindingCard`, `/review` page, or `/dashboard/reviews` — they already render whatever `summary`/`findings`/`recommendations` shape the API returns, and that shape doesn't change.
- No changes to quota accounting rules beyond "images count as one analysis" — already how the existing single-file flow works, just confirmed to extend the same way here.

## Verification plan

- Manual, via `npm run dev`: photograph (or synthesize) a short Georgian contract across 2–3 JPGs, upload in Photos mode, confirm merged OCR text flows into a real analysis with correct page-order in the underlying text (verify via the saved `DocumentReview.summary`/log, since raw OCR text itself isn't shown in the UI).
- Deliberately include one corrupted/unreadable JPG among valid ones — confirm it's skipped, analysis still completes, `skippedImages` notice shows in the modal.
- Upload only corrupted/unreadable JPGs — confirm the whole request fails cleanly with no `DocumentReview` saved and no quota decrement.
- Attempt to select 11+ images — confirm the 10-image cap is enforced client-side.
- Confirm Document mode (existing single-file flow) is pixel-for-pixel unchanged after adding the toggle.
- `npm run lint` / `npx tsc --noEmit` clean.
