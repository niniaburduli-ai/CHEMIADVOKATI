import { Schema, model, models, type Model } from "mongoose"

const FooterContentSchema = new Schema(
  {
    columns: [
      {
        heading: { type: String, default: "" },
        links: [{ label: String, href: String }],
        order: { type: Number, default: 0 },
      },
    ],
    disclaimer: { type: String, default: "" },
    copyright: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published", "hidden"], default: "draft" },
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type FooterContentDoc = { columns: unknown[]; disclaimer: string; copyright: string; status: string; locale: string; _id: unknown }

export const FooterContent: Model<FooterContentDoc> =
  (models.FooterContent as Model<FooterContentDoc>) || model<FooterContentDoc>("FooterContent", FooterContentSchema)
