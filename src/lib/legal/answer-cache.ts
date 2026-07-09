/**
 * Caches a finished chat answer (prose + legal basis + web sources) by
 * normalized question text, so an identical repeat question gets the exact
 * same answer instead of re-running the whole retrieval/generation pipeline —
 * which could otherwise pick a different citation among near-tied candidates
 * (see hasVerifiedCitation) and cost real money again for no reason.
 * Same in-memory/global-survives-hot-reload pattern as fetch-source.ts.
 */
import type { LegalBasisGroup } from "./citations";
import type { WebSource } from "./openrouter";

export type CachedAnswer = {
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
};

type CacheEntry = { value: CachedAnswer; expires: number };

const TTL_MS = 24 * 60 * 60 * 1000;

declare global {
  var __answerCache: Map<string, CacheEntry> | undefined;
}
const cache: Map<string, CacheEntry> =
  globalThis.__answerCache ?? (globalThis.__answerCache = new Map());

function normalizeQuestion(q: string): string {
  return q.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getCachedAnswer(question: string): CachedAnswer | null {
  const entry = cache.get(normalizeQuestion(question));
  if (!entry || entry.expires <= Date.now()) return null;
  return entry.value;
}

export function setCachedAnswer(question: string, value: CachedAnswer): void {
  cache.set(normalizeQuestion(question), {
    value,
    expires: Date.now() + TTL_MS,
  });
}
