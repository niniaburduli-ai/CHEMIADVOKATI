import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Persisted counterpart to the old per-instance in-memory matsne fetch cache
 * (see lib/legal/fetch-source.ts). Same cross-instance gap as answer-cache:
 * a cold/different Vercel Function instance had no memory of a prior fetch,
 * so it re-fetched matsne.gov.ge (a multi-MB page, behind a flaky WAF) on
 * every single chat request that instance handled — and on the WAF denying
 * that instance specifically, the request fell through to the web-search
 * fallback while a warm instance answered the identical question from the
 * real law text, producing different sources for the same question. Only
 * the 8 APPROVED_SOURCES urls are ever stored here, so this collection stays
 * tiny — no TTL index needed; `expiresAt` is checked in application code so
 * a still-expired-but-present row can be served as a stale fallback if a
 * live re-fetch fails, matching the old cache's behavior exactly.
 */
const FetchedSourceSchema = new Schema(
  {
    url: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export type FetchedSourceCacheDoc = InferSchemaType<typeof FetchedSourceSchema>;

export const FetchedSourceModel: Model<FetchedSourceCacheDoc> =
  (models.FetchedSourceCache as Model<FetchedSourceCacheDoc>) ||
  model<FetchedSourceCacheDoc>("FetchedSourceCache", FetchedSourceSchema);
