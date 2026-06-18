import type { Model } from "mongoose"
import { User } from "@/lib/models/user"
import { Consultation } from "@/lib/models/consultation"
import { GeneratedDocument } from "@/lib/models/generated-document"
import { DocumentReview } from "@/lib/models/document-review"
import { Upload } from "@/lib/models/upload"
import { Plan } from "@/lib/models/Plan"
import { Payment } from "@/lib/models/payment"
import { Subscription } from "@/lib/models/subscription"
import { LegislationDoc } from "@/lib/models/legislation"
import { SiteConfig } from "@/lib/models/SiteConfig"
import { NavMenu } from "@/lib/models/NavMenu"
import { HomePage } from "@/lib/models/HomePage"
import { AboutPage } from "@/lib/models/AboutPage"
import { FAQ } from "@/lib/models/FAQ"
import { FooterContent } from "@/lib/models/FooterContent"
import { LegalNotice } from "@/lib/models/LegalNotice"
import { BlogPost } from "@/lib/models/BlogPost"
import { BlogCategory } from "@/lib/models/BlogCategory"
import { ThemeConfig } from "@/lib/models/ThemeConfig"
import { FeatureFlags } from "@/lib/models/FeatureFlags"

export type AdminCollection = {
  slug: string
  label: string
  model: Model<unknown>
  /** Fields never returned to the client nor writable from the editor. */
  hidden: string[]
}

/**
 * Safelist of collections the generic DB explorer can read/write. Anything not
 * here is inaccessible. `hidden` fields (secrets) are stripped on read and
 * rejected on write.
 */
export const ADMIN_COLLECTIONS: AdminCollection[] = [
  { slug: "users", label: "Users", model: User as unknown as Model<unknown>, hidden: ["passwordHash"] },
  { slug: "plans", label: "Plans", model: Plan as unknown as Model<unknown>, hidden: [] },
  { slug: "consultations", label: "Consultations", model: Consultation as unknown as Model<unknown>, hidden: [] },
  { slug: "generated-documents", label: "Generated Documents", model: GeneratedDocument as unknown as Model<unknown>, hidden: [] },
  { slug: "document-reviews", label: "Document Reviews", model: DocumentReview as unknown as Model<unknown>, hidden: [] },
  { slug: "uploads", label: "Uploads", model: Upload as unknown as Model<unknown>, hidden: [] },
  { slug: "payments", label: "Payments", model: Payment as unknown as Model<unknown>, hidden: [] },
  { slug: "subscriptions", label: "Subscriptions", model: Subscription as unknown as Model<unknown>, hidden: [] },
  { slug: "legislation", label: "Legislation", model: LegislationDoc as unknown as Model<unknown>, hidden: [] },
  { slug: "site-config", label: "Site Config", model: SiteConfig as unknown as Model<unknown>, hidden: [] },
  { slug: "nav-menus", label: "Nav Menus", model: NavMenu as unknown as Model<unknown>, hidden: [] },
  { slug: "home-pages", label: "Home Pages", model: HomePage as unknown as Model<unknown>, hidden: [] },
  { slug: "about-pages", label: "About Pages", model: AboutPage as unknown as Model<unknown>, hidden: [] },
  { slug: "faqs", label: "FAQ", model: FAQ as unknown as Model<unknown>, hidden: [] },
  { slug: "footers", label: "Footers", model: FooterContent as unknown as Model<unknown>, hidden: [] },
  { slug: "legal-notices", label: "Legal Notices", model: LegalNotice as unknown as Model<unknown>, hidden: [] },
  { slug: "blog-posts", label: "Blog Posts", model: BlogPost as unknown as Model<unknown>, hidden: [] },
  { slug: "blog-categories", label: "Blog Categories", model: BlogCategory as unknown as Model<unknown>, hidden: [] },
  { slug: "theme-config", label: "Theme Config", model: ThemeConfig as unknown as Model<unknown>, hidden: [] },
  { slug: "feature-flags", label: "Feature Flags", model: FeatureFlags as unknown as Model<unknown>, hidden: [] },
]

export function getCollection(slug: string): AdminCollection | null {
  return ADMIN_COLLECTIONS.find((c) => c.slug === slug) ?? null
}

/** Remove hidden + system-write fields from an inbound document. */
export function sanitizeWrite(
  body: Record<string, unknown>,
  hidden: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const block = new Set(["_id", "__v", "createdAt", "updatedAt", ...hidden])
  for (const [k, v] of Object.entries(body)) {
    if (!block.has(k)) out[k] = v
  }
  return out
}

/** Strip hidden fields from a doc read out of the DB. */
export function stripHidden<T extends Record<string, unknown>>(doc: T, hidden: string[]): T {
  if (!hidden.length) return doc
  const clone = { ...doc }
  for (const h of hidden) delete clone[h]
  return clone
}
