/**
 * Same-day SEMANTIC cache for finished chat answers. Matches by meaning (via
 * a cheap embedding), not exact text, so "Fine for speeding?" and "Speed
 * limit ticket cost?" hit the same entry despite sharing almost no words —
 * skipping the expensive expandQuery/searchWebContext/generateLegalAnswer
 * (+ escalation) pipeline entirely on a hit. Resets daily at local midnight
 * in Asia/Tbilisi: repeats within a day are near-certainly the same question
 * from a different person, but legal answers shouldn't be served stale
 * across days.
 *
 * Same in-memory/global-survives-hot-reload pattern as fetch-source.ts. Not
 * shared across serverless instances — a best-effort cost optimization, not
 * a correctness guarantee.
 */
import type { LegalBasisGroup } from "./citations";
import type { WebSource } from "./openrouter";
import { embedText, cosineSimilarity } from "./embeddings";

export type CachedAnswer = {
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
};

type CacheEntry = { embedding: number[]; value: CachedAnswer };

/**
 * Cosine similarity above this counts as "the same question" for
 * text-embedding-3-small on short legal questions. Tuned conservatively: a
 * false negative just costs one normal (uncached) answer; a false positive
 * would serve a wrong cached answer, which is worse — so when in doubt, miss.
 */
const SIMILARITY_THRESHOLD = 0.9;

declare global {
  var __semanticAnswerCache: Map<string, CacheEntry[]> | undefined;
}
const cacheByDay: Map<string, CacheEntry[]> =
  globalThis.__semanticAnswerCache ?? (globalThis.__semanticAnswerCache = new Map());

/** Georgia-local calendar day key, so the cache resets at Tbilisi midnight
 * regardless of the server's own timezone. */
function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tbilisi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Drop every day except today — this IS the daily reset. */
function pruneOldDays(today: string): void {
  for (const key of cacheByDay.keys()) {
    if (key !== today) cacheByDay.delete(key);
  }
}

export async function getCachedAnswer(question: string): Promise<CachedAnswer | null> {
  const today = todayKey();
  pruneOldDays(today);
  const bucket = cacheByDay.get(today);
  if (!bucket || bucket.length === 0) return null; // nothing cached yet today — skip the embed call

  const embedding = await embedText(question);
  if (!embedding) return null; // embedding failed — treat as a miss, never block the real pipeline

  let best: CacheEntry | null = null;
  let bestScore = 0;
  for (const entry of bucket) {
    const score = cosineSimilarity(embedding, entry.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  return best && bestScore >= SIMILARITY_THRESHOLD ? best.value : null;
}

export async function setCachedAnswer(question: string, value: CachedAnswer): Promise<void> {
  const embedding = await embedText(question);
  if (!embedding) return; // no usable key to cache under — next request just misses, same as before

  const today = todayKey();
  pruneOldDays(today);
  const bucket = cacheByDay.get(today) ?? [];
  bucket.push({ embedding, value });
  cacheByDay.set(today, bucket);
}
