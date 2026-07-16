import { Schema, model, models, type Model } from "mongoose"

/**
 * Subscription plan — DB-backed so admins can edit pricing, quotas, and add new
 * plans without a deploy. `key` is the stable identifier used in `user.plan`,
 * Flitt `order_id`, and checkout validation. It must never contain `_` (the
 * order_id delimiter) and is lowercased.
 */
const PlanSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: "" },
    description: { type: String, default: "" },
    descriptionEn: { type: String, default: "" },
    // Price in GEL minor units (1900 = 19.00 GEL). 0 for the free plan.
    priceMinor: { type: Number, default: 0, min: 0 },
    // Discounted price in GEL minor units. 0 = no discount. Must be < priceMinor to take effect.
    discountPriceMinor: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "GEL" },
    period: { type: String, default: "month" },
    // Monthly quotas granted on activation / reset.
    consultations: { type: Number, default: 0, min: 0 },
    docGeneration: { type: Number, default: 0, min: 0 },
    docReview: { type: Number, default: 0, min: 0 },
    docTemplates: { type: Number, default: 0, min: 0 },
    // Bullet list shown on the pricing card — base (always visible).
    features: { type: [String], default: [] },
    featuresEn: { type: [String], default: [] },
    // Service-specific bullets — shown only when that service is enabled globally + per-plan.
    featuresDocGeneration: { type: [String], default: [] },
    featuresDocGenerationEn: { type: [String], default: [] },
    featuresDocReview: { type: [String], default: [] },
    featuresDocReviewEn: { type: [String], default: [] },
    featuresDocTemplates: { type: [String], default: [] },
    featuresDocTemplatesEn: { type: [String], default: [] },
    includeDocGeneration: { type: Boolean, default: true },
    includeDocReview: { type: Boolean, default: true },
    includeDocTemplates: { type: Boolean, default: true },
    isFree: { type: Boolean, default: false },
    highlighted: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },   // show on public pricing page
    active: { type: Boolean, default: true },     // can be subscribed to
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export type PlanDoc = {
  _id: unknown
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  discountPriceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

export const Plan: Model<PlanDoc> =
  (models.Plan as Model<PlanDoc>) || model<PlanDoc>("Plan", PlanSchema)
