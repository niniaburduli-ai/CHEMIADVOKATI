/**
 * Pure constants/functions for document-review sizing and credit cost.
 * Deliberately has ZERO imports — document-analysis.ts (which pulls in
 * pdf-parse, mammoth, tesseract.js) is server-only, but validators.ts is
 * shared with client components (e.g. admin-dashboard.tsx), so anything
 * validators.ts needs from "the review feature" must live in a leaf module
 * like this one instead of importing document-analysis.ts directly — doing
 * that once already broke the client bundle by dragging pdf-parse's native
 * fs/canvas bindings into the browser.
 */

/**
 * Hard safety ceiling on characters sent to the model — a backstop, not the
 * primary cost control. The primary control is MAX_REVIEW_PAGES below,
 * enforced before extraction ever reaches this cap; this only protects
 * against a pathological single-page file with an extreme amount of text.
 */
export const MAX_ANALYSIS_TEXT = 300_000;

/**
 * Page-based quota for /api/review. 1 credit covers up to BASE_REVIEW_PAGES
 * pages; each additional block of PAGES_PER_EXTRA_CREDIT pages costs one
 * more credit (10 pages → 1 credit, 11–20 → 2 credits, 21–30 → 3, ...).
 * Documents are never truncated up to MAX_REVIEW_PAGES — the full text is
 * analyzed, and the extra AI cost of a long document is covered by charging
 * more credits instead.
 */
export const BASE_REVIEW_PAGES = 10;
export const PAGES_PER_EXTRA_CREDIT = 10;
/** Hard ceiling regardless of quota — protects against runaway AI cost (and
 * context-window blowup) even for admins, who bypass credit deduction. */
export const MAX_REVIEW_PAGES = 50;
/** Heuristic page density for formats with no native pagination (DOCX, TXT,
 * MD, pasted text) — ~3000 characters is a reasonable page of dense Georgian
 * legal text. PDFs use the real page count from the parser instead. */
export const PAGE_CHAR_ESTIMATE = 3000;

/** Credits required to review a document of this many pages. */
export function reviewCreditCost(pages: number): number {
  if (pages <= BASE_REVIEW_PAGES) return 1;
  return 1 + Math.ceil((pages - BASE_REVIEW_PAGES) / PAGES_PER_EXTRA_CREDIT);
}

/** Page-count heuristic for formats without native pagination. */
export function estimatePages(text: string): number {
  return Math.max(1, Math.ceil(text.length / PAGE_CHAR_ESTIMATE));
}
