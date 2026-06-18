import { Schema, model, models, type Model } from "mongoose"

const SiteConfigSchema = new Schema(
  {
    logoUrl: { type: String, default: "" },
    logoPubId: { type: String, default: "" },
    siteName: { type: String, default: "ჩემი იურისტი" },
    tagline: { type: String, default: "" },
    favicon: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    contactAddress: { type: String, default: "" },
    socialLinks: {
      facebook: { type: String, default: "" },
      twitter: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type SiteConfigDoc = {
  logoUrl: string; logoPubId: string; siteName: string; tagline: string
  favicon: string; contactEmail: string; contactPhone: string; contactAddress: string
  socialLinks: { facebook?: string; twitter?: string; linkedin?: string; youtube?: string }
  locale: string
  _id: unknown; createdAt: Date; updatedAt: Date
}

export const SiteConfig: Model<SiteConfigDoc> =
  (models.SiteConfig as Model<SiteConfigDoc>) || model<SiteConfigDoc>("SiteConfig", SiteConfigSchema)
