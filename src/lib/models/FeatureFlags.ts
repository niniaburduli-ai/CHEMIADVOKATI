import { Schema, model, models, type Model } from "mongoose"

/**
 * Global product feature flags — a singleton. When a flag is off, the product is
 * hidden from nav + homepage cards and its route is blocked (see lib/features.ts).
 */
const FeatureFlagsSchema = new Schema(
  {
    chat: { type: Boolean, default: true },
    generate: { type: Boolean, default: true },
    review: { type: Boolean, default: true },
    legislation: { type: Boolean, default: true },
    blog: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
)

export type FeatureFlagsDoc = {
  _id: unknown
  chat: boolean
  generate: boolean
  review: boolean
  legislation: boolean
  blog: boolean
  createdAt: Date
  updatedAt: Date
}

export const FeatureFlags: Model<FeatureFlagsDoc> =
  (models.FeatureFlags as Model<FeatureFlagsDoc>) ||
  model<FeatureFlagsDoc>("FeatureFlags", FeatureFlagsSchema)
