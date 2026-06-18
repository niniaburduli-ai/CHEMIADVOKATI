import { Schema, model, models, type Model } from "mongoose"

const NavMenuSchema = new Schema(
  {
    items: [
      {
        label: { type: String, required: true },
        href: { type: String, required: true },
        order: { type: Number, default: 0 },
        isExternal: { type: Boolean, default: false },
      },
    ],
    status: { type: String, enum: ["draft", "published", "hidden"], default: "draft" },
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type NavMenuDoc = {
  items: Array<{ _id: unknown; label: string; href: string; order: number; isExternal: boolean }>
  status: string; locale: string; _id: unknown; createdAt: Date; updatedAt: Date
}

export const NavMenu: Model<NavMenuDoc> =
  (models.NavMenu as Model<NavMenuDoc>) || model<NavMenuDoc>("NavMenu", NavMenuSchema)
