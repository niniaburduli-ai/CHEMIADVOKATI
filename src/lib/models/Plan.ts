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
    currency: { type: String, default: "GEL" },
    period: { type: String, default: "month" },
    // Monthly quotas granted on activation / reset.
    consultations: { type: Number, default: 0, min: 0 },
    docGeneration: { type: Number, default: 0, min: 0 },
    docReview: { type: Number, default: 0, min: 0 },
    // Bullet list shown on the pricing card.
    features: { type: [String], default: [] },
    featuresEn: { type: [String], default: [] },
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
  currency: string
  period: string
  consultations: number
  docGeneration: number
  docReview: number
  features: string[]
  featuresEn: string[]
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
