import { Schema, model, models, type Model } from "mongoose"
import type { HomePageData } from "@/types/cms"

const serviceCardSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, default: "" },
    titleEn: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    subtitleEn: { type: String, default: "" },
    ctaText: { type: String, default: "" },
    ctaTextEn: { type: String, default: "" },
    href: { type: String, default: "" },
    icon: { type: String, default: "" },
    comingSoon: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
)

const statCardSchema = new Schema(
  {
    _id: { type: String, required: true },
    label: { type: String, default: "" },
    labelEn: { type: String, default: "" },
    value: { type: String, default: "0" },
    icon: { type: String, default: "" },
    metric: { type: String, default: "" },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
)

const featureSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, default: "" },
    titleEn: { type: String, default: "" },
    body: { type: String, default: "" },
    bodyEn: { type: String, default: "" },
    icon: { type: String, default: "" },
    order: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
  },
  { _id: false }
)

const planSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, default: "" },
    price: { type: String, default: "0" },
    badge: { type: String, default: "" },
    ctaText: { type: String, default: "" },
    ctaHref: { type: String, default: "/register" },
    plan: { type: String, default: "" },
    highlighted: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    items: [{ type: String }],
  },
  { _id: false }
)

const HomePageSchema = new Schema(
  {
    sections: {
      hero: { type: Boolean, default: true },
      stats: { type: Boolean, default: true },
      features: { type: Boolean, default: true },
      pricing: { type: Boolean, default: true },
      faq: { type: Boolean, default: true },
    },
    hero: {
      title: { type: String, default: "" },
      titleEn: { type: String, default: "" },
      subtitle: { type: String, default: "" },
      subtitleEn: { type: String, default: "" },
      ctaText: { type: String, default: "" },
      ctaHref: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
      imagePubId: { type: String, default: "" },
    },
    serviceCards: [serviceCardSchema],
    cardsHeading: { type: String, default: "" },
    cardsHeadingEn: { type: String, default: "" },
    statsHeading: { type: String, default: "" },
    statsHeadingEn: { type: String, default: "" },
    stats: [statCardSchema],
    featuresHeading: { type: String, default: "" },
    featuresHeadingEn: { type: String, default: "" },
    features: [featureSchema],
    pricingHeading: { type: String, default: "" },
    pricingHeadingEn: { type: String, default: "" },
    plans: [planSchema],
    faqHeading: { type: String, default: "" },
    faqHeadingEn: { type: String, default: "" },
    ctaSection: {
      buttonText: { type: String, default: "" },
      buttonTextEn: { type: String, default: "" },
      buttonHref: { type: String, default: "" },
    },
    status: { type: String, enum: ["draft", "published", "hidden"], default: "draft" },
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type HomePageDoc = HomePageData & { _id: unknown; locale?: string }

export const HomePage: Model<HomePageDoc> =
  (models.HomePage as Model<HomePageDoc>) || model<HomePageDoc>("HomePage", HomePageSchema)
