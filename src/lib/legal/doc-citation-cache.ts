/**
 * Verified legal-basis citations for AI-generated documents, cached per doc
 * type. There are only two generatable types (complaint, demand-letter) and
 * the Georgian law articles that typically apply to each barely change over
 * time, so paying Perplexity's live web-search fee on every single
 * generation is wasted spend after the first verified result for that type.
 * Long TTL (30 days) mirrors fetch-source.ts's reasoning for law text: it
 * changes rarely, so a stale cache is a good tradeoff for the cost saved.
 *
 * Persisted in Mongo rather than in-memory: a globalThis Map only caught
 * repeats on the same warm Vercel Function instance, so every other cold
 * instance re-paid the live Perplexity fee for a type that had already been
 * verified elsewhere — defeating the "once per 30 days" intent. A failed/
 * empty verification is never cached, so the next request just tries the
 * live call again instead of caching a miss.
 */
import { dbConnect } from "../db";
import { DocCitationCacheModel } from "../models/doc-citation-cache";

export type GeneratableDocType = "complaint" | "demand-letter";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function getCachedCitations(type: GeneratableDocType): Promise<string | null> {
  await dbConnect();
  const entry = await DocCitationCacheModel.findOne({ docType: type }).lean();
  if (!entry || entry.expiresAt.getTime() <= Date.now()) return null;
  return entry.legalBasis;
}

export async function setCachedCitations(
  type: GeneratableDocType,
  legalBasis: string
): Promise<void> {
  await dbConnect();
  await DocCitationCacheModel.findOneAndUpdate(
    { docType: type },
    { docType: type, legalBasis, expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true }
  );
}
