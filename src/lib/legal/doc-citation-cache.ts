/**
 * Verified legal-basis citations for AI-generated documents, cached per doc
 * type. There are only two generatable types (complaint, demand-letter) and
 * the Georgian law articles that typically apply to each barely change over
 * time, so paying Perplexity's live web-search fee on every single
 * generation is wasted spend after the first verified result for that type.
 * Long TTL (30 days) mirrors fetch-source.ts's reasoning for law text: it
 * changes rarely, so a stale cache is a good tradeoff for the cost saved.
 *
 * Same in-memory/global-survives-hot-reload pattern as fetch-source.ts and
 * answer-cache.ts. A failed/empty verification is never cached, so the next
 * request just tries the live call again instead of caching a miss.
 */
export type GeneratableDocType = "complaint" | "demand-letter";

type CacheEntry = { legalBasis: string; expires: number };

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

declare global {
  var __docCitationCache: Map<GeneratableDocType, CacheEntry> | undefined;
}
const cache: Map<GeneratableDocType, CacheEntry> =
  globalThis.__docCitationCache ?? (globalThis.__docCitationCache = new Map());

export function getCachedCitations(type: GeneratableDocType): string | null {
  const entry = cache.get(type);
  if (!entry || entry.expires <= Date.now()) return null;
  return entry.legalBasis;
}

export function setCachedCitations(type: GeneratableDocType, legalBasis: string): void {
  cache.set(type, { legalBasis, expires: Date.now() + TTL_MS });
}
