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
 * Persisted in Mongo (AnswerCacheModel) rather than in-memory: Vercel
 * Functions don't share memory across instances, so an in-memory Map only
 * caught repeats that happened to land on the same warm instance, silently
 * re-running the full pipeline (and, for questions the 8 approved sources
 * don't cover, re-running a live, non-deterministic web search) on every
 * other repeat — the visible symptom being different answers/sources for
 * the identical question asked minutes apart. A shared store fixes both the
 * cost duplication and the inconsistency.
 */
import { dbConnect } from "../db";
import { AnswerCacheModel } from "../models/answer-cache";
import type { LegalBasisGroup } from "./citations";
import type { WebSource } from "./openrouter";
import { embedText, cosineSimilarity } from "./embeddings";

export type CachedAnswer = {
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
};

/**
 * Cosine similarity above this counts as "the same question" for
 * text-embedding-3-small on short legal questions. Tuned conservatively: a
 * false negative just costs one normal (uncached) answer; a false positive
 * would serve a wrong cached answer, which is worse — so when in doubt, miss.
 */
const SIMILARITY_THRESHOLD = 0.9;

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

export type CacheLookup = {
  value: CachedAnswer | null;
  /** The question's embedding, if one was computed — reuse it in
   * setCachedAnswer so a cache-miss doesn't pay for the same embedding twice. */
  embedding: number[] | null;
};

export async function getCachedAnswer(question: string): Promise<CacheLookup> {
  await dbConnect();
  const bucket = await AnswerCacheModel.find({ dayKey: todayKey() }).lean();
  if (bucket.length === 0) return { value: null, embedding: null }; // nothing cached yet today — skip the embed call

  const embedding = await embedText(question);
  if (!embedding) return { value: null, embedding: null }; // embedding failed — treat as a miss, never block the real pipeline

  let best: (typeof bucket)[number] | null = null;
  let bestScore = 0;
  for (const entry of bucket) {
    const score = cosineSimilarity(embedding, entry.embedding as number[]);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  const value: CachedAnswer | null =
    best && bestScore >= SIMILARITY_THRESHOLD
      ? {
          answer: best.answer,
          legalBasis: best.legalBasis as LegalBasisGroup[],
          webSources: best.webSources as WebSource[] | undefined,
        }
      : null;
  return { value, embedding };
}

/** `embedding` may be reused from a prior getCachedAnswer call on the same
 * question — falls back to computing it here if the caller doesn't have one
 * (e.g. bucket was empty, so getCachedAnswer skipped the embed call). */
export async function setCachedAnswer(
  question: string,
  value: CachedAnswer,
  embedding?: number[] | null
): Promise<void> {
  const emb = embedding ?? (await embedText(question));
  if (!emb) return; // no usable key to cache under — next request just misses, same as before

  await dbConnect();
  await AnswerCacheModel.create({
    dayKey: todayKey(),
    embedding: emb,
    answer: value.answer,
    legalBasis: value.legalBasis,
    webSources: value.webSources ?? [],
  });
}
