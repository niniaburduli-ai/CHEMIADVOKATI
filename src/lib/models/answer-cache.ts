import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Persisted counterpart to the old per-instance in-memory answer cache
 * (see lib/legal/answer-cache.ts). Vercel Functions don't share memory across
 * instances, so a globalThis Map only ever caught same-question repeats that
 * happened to land back on the same warm instance — everything else silently
 * re-ran the full generation/web-search pipeline, both wasting the "once per
 * day" cost saving and producing a different answer/sources each time for an
 * identical question. Mongo makes the cache visible to every instance.
 */
const AnswerCacheSchema = new Schema(
  {
    dayKey: { type: String, required: true, index: true },
    embedding: { type: [Number], required: true },
    answer: { type: String, required: true },
    legalBasis: { type: Schema.Types.Mixed, default: [] },
    webSources: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

// Safety-net cleanup only — correctness comes from filtering on dayKey, not
// from this TTL. 2 days covers a Tbilisi-midnight reset regardless of the
// server's own timezone.
AnswerCacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 });

export type AnswerCacheDoc = InferSchemaType<typeof AnswerCacheSchema>;

export const AnswerCacheModel: Model<AnswerCacheDoc> =
  (models.AnswerCache as Model<AnswerCacheDoc>) ||
  model<AnswerCacheDoc>("AnswerCache", AnswerCacheSchema);
