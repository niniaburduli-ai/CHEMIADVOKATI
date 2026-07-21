import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Persisted counterpart to the old per-instance in-memory doc-citation cache
 * (see lib/legal/doc-citation-cache.ts). Only 2 possible doc types exist, so
 * this collection never grows past 2 rows — but per-instance memory meant
 * every cold Vercel Function instance paid Perplexity's live web-search fee
 * again for a type it hadn't personally verified yet, instead of the
 * intended "once per type per 30 days" for the whole app.
 */
const DocCitationCacheSchema = new Schema(
  {
    docType: { type: String, required: true, unique: true },
    legalBasis: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export type DocCitationCacheDoc = InferSchemaType<typeof DocCitationCacheSchema>;

export const DocCitationCacheModel: Model<DocCitationCacheDoc> =
  (models.DocCitationCache as Model<DocCitationCacheDoc>) ||
  model<DocCitationCacheDoc>("DocCitationCache", DocCitationCacheSchema);
