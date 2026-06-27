export type CMSStatus = "draft" | "published" | "hidden"
export type LegalNoticeType = "ai-warning" | "terms" | "privacy" | "cookie"

export interface SiteConfigData {
  logoUrl: string
  logoPubId: string
  siteName: string
  tagline: string
  favicon: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  socialLinks: { facebook?: string; twitter?: string; linkedin?: string; youtube?: string }
}

export interface NavItem {
  _id: string
  label: string
  href: string
  order: number
  isExternal: boolean
}
export interface NavMenuData { items: NavItem[]; status: CMSStatus }

// ── Homepage sub-types ────────────────────────────────────────────────────────

export interface HomePageServiceCard {
  _id: string
  title: string
  titleEn?: string
  subtitle: string
  subtitleEn?: string
  description?: string
  ctaText?: string
  ctaTextEn?: string
  href: string
  icon: string        // lucide icon name e.g. "MessageSquare"
  comingSoon: boolean
  visible: boolean
  order: number
}

export interface HomePageStatCard {
  _id: string
  label: string
  labelEn?: string
  value: string       // manual display value (used when no metric bound), e.g. "19+"
  icon: string        // lucide icon name
  metric?: string     // bind to a live count: users|consultations|documents|reviews|uploads
  visible: boolean
  order: number
}

export interface HomePageFeature {
  _id: string
  title: string
  titleEn?: string
  body: string
  bodyEn?: string
  icon: string
  order: number
  visible: boolean
}

export interface HomePagePlan {
  _id: string
  name: string
  price: string
  badge: string
  ctaText: string
  ctaHref: string
  plan: string        // "" | "standard" | "premium" — controls which CTA component renders
  highlighted: boolean
  visible: boolean
  order: number
  items: string[]
}

export interface HomePageData {
  sections: {
    hero: boolean
    stats: boolean
    features: boolean
    pricing: boolean
    cta: boolean
  }
  hero: {
    title: string
    titleEn?: string
    subtitle: string
    subtitleEn?: string
    ctaText: string
    ctaHref: string
    imageUrl: string
    imagePubId: string
  }
  serviceCards: HomePageServiceCard[]
  cardsHeading: string
  cardsHeadingEn?: string
  statsHeading: string
  statsHeadingEn?: string
  stats: HomePageStatCard[]
  featuresHeading: string
  featuresHeadingEn?: string
  features: HomePageFeature[]
  pricingHeading: string
  pricingHeadingEn?: string
  plans: HomePagePlan[]
  ctaSection: {
    title: string
    titleEn?: string
    subtitle: string
    subtitleEn?: string
    buttonText: string
    buttonTextEn?: string
    buttonHref: string
  }
  status: CMSStatus
}

// ── Other CMS types (unchanged) ───────────────────────────────────────────────

export interface AboutPageData {
  title: string
  intro: string
  body: object
  historyTitle: string
  historyBody: string
  missionTitle: string
  mission: string
  team: Array<{ _id: string; name: string; role: string; imageUrl: string; imagePubId: string; order: number }>
  status: CMSStatus
}

export interface FAQItem {
  _id: string
  question: string
  answer: string
  category: string
  order: number
  status: CMSStatus
}
export interface FAQData { items: FAQItem[] }

export interface BlogCategoryData {
  _id: string
  name: string
  slug: string
  description: string
  status: CMSStatus
}

export interface BlogPostData {
  _id: string
  title: string
  slug: string
  body: object
  excerpt: string
  coverImageUrl: string
  coverImagePubId: string
  category: string
  tags: string[]
  author: string
  status: CMSStatus
  publishedAt: string | null
  createdAt: string
}

export interface FooterColumn {
  _id: string
  heading: string
  links: Array<{ label: string; href: string }>
  order: number
}
export interface FooterData {
  columns: FooterColumn[]
  disclaimer: string
  copyright: string
  status: CMSStatus
}

export interface LegalNoticeData {
  _id: string
  type: LegalNoticeType
  title: string
  body: object
  status: CMSStatus
  publishedAt: string | null
}
