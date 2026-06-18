import { Schema, model, models, type Model } from "mongoose"

const FAQSchema = new Schema(
  {
    items: [
      {
        question: { type: String, default: "" },
        answer: { type: String, default: "" },
        category: { type: String, default: "" },
        order: { type: Number, default: 0 },
        status: { type: String, enum: ["draft", "published", "hidden"], default: "draft" },
      },
    ],
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type FAQDoc = { items: Array<{ _id: unknown; question: string; answer: string; category: string; order: number; status: string }>; locale: string; _id: unknown }

export const FAQ: Model<FAQDoc> =
  (models.FAQ as Model<FAQDoc>) || model<FAQDoc>("FAQ", FAQSchema)
