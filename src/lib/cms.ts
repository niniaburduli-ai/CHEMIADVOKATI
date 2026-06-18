import { dbConnect } from "@/lib/db"
import { SiteConfig } from "@/lib/models/SiteConfig"
import { NavMenu } from "@/lib/models/NavMenu"
import { HomePage } from "@/lib/models/HomePage"
import { AboutPage } from "@/lib/models/AboutPage"
import { FAQ } from "@/lib/models/FAQ"
import { FooterContent } from "@/lib/models/FooterContent"
import { LegalNotice } from "@/lib/models/LegalNotice"
import { BlogPost } from "@/lib/models/BlogPost"
import type {
  SiteConfigData, NavMenuData, HomePageData, AboutPageData,
  FAQData, FooterData, LegalNoticeData, LegalNoticeType, BlogPostData,
} from "@/types/cms"
import type { Locale } from "@/lib/i18n/config"

/** Mongo filter selecting the requested locale's docs (ka = anything not "en"). */
function localeMatch(locale: Locale) {
  return locale === "en" ? { locale: "en" } : { locale: { $ne: "en" } }
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_SITE_CONFIG: SiteConfigData = {
  logoUrl: "", logoPubId: "", siteName: "ჩემი იურისტი", tagline: "",
  favicon: "", contactEmail: "", contactPhone: "", contactAddress: "", socialLinks: {},
}

const DEFAULT_NAV: NavMenuData = {
  items: [
    { _id: "1", label: "მთავარი", href: "/", order: 0, isExternal: false },
    { _id: "2", label: "ჩვენ შესახებ", href: "/about", order: 1, isExternal: false },
    { _id: "3", label: "მომსახურებები", href: "/#services", order: 2, isExternal: false },
    { _id: "4", label: "ბლოგი", href: "/blog", order: 3, isExternal: false },
    { _id: "5", label: "კანონმდებლობა", href: "/legislation", order: 4, isExternal: false },
  ],
  status: "published",
}

const DEFAULT_FOOTER: FooterData = {
  columns: [], disclaimer: "ეს სერვისი არ წარმოადგენს იურიდიულ კონსულტაციას.", copyright: `© ${new Date().getFullYear()} ჩემი იურისტი`, status: "published",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPlain<T>(doc: T): T {
  if (!doc) return doc
  const obj = JSON.parse(JSON.stringify(doc)) as T
  return obj
}

// ─── Public Getters ───────────────────────────────────────────────────────────

export async function getSiteConfig(locale: Locale = "ka"): Promise<SiteConfigData> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await SiteConfig.findOne({ locale: "en" }).lean() : null
    if (!doc) doc = await SiteConfig.findOne({ locale: { $ne: "en" } }).lean()
    if (!doc) doc = await SiteConfig.findOne().lean()
    if (!doc) return DEFAULT_SITE_CONFIG
    return toPlain({
      logoUrl: doc.logoUrl, logoPubId: doc.logoPubId, siteName: doc.siteName,
      tagline: doc.tagline, favicon: doc.favicon, contactEmail: doc.contactEmail,
      contactPhone: doc.contactPhone, contactAddress: doc.contactAddress,
      socialLinks: doc.socialLinks ?? {},
    })
  } catch { return DEFAULT_SITE_CONFIG }
}

export async function getNavMenu(locale: Locale = "ka"): Promise<NavMenuData> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await NavMenu.findOne({ status: "published", locale: "en" }).lean() : null
    if (!doc) doc = await NavMenu.findOne({ status: "published", locale: { $ne: "en" } }).lean()
    if (!doc) return DEFAULT_NAV
    return toPlain({
      items: doc.items.map((i) => ({
        _id: String(i._id), label: i.label, href: i.href, order: i.order, isExternal: i.isExternal,
      })).sort((a, b) => a.order - b.order),
      status: doc.status as "published",
    })
  } catch { return DEFAULT_NAV }
}

export async function getHomePage(locale: Locale = "ka"): Promise<HomePageData | null> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await HomePage.findOne({ status: "published", locale: "en" }).lean() : null
    if (!doc) doc = await HomePage.findOne({ status: "published", locale: { $ne: "en" } }).lean()
    if (!doc) return null
    return toPlain(doc as unknown as HomePageData)
  } catch { return null }
}

export async function getAboutPage(locale: Locale = "ka"): Promise<AboutPageData | null> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await AboutPage.findOne({ status: "published", locale: "en" }).lean() : null
    if (!doc) doc = await AboutPage.findOne({ status: "published", locale: { $ne: "en" } }).lean()
    if (!doc) return null
    return toPlain(doc as unknown as AboutPageData)
  } catch { return null }
}

export async function getFAQ(locale: Locale = "ka"): Promise<FAQData> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await FAQ.findOne({ locale: "en" }).lean() : null
    if (!doc) doc = await FAQ.findOne({ locale: { $ne: "en" } }).lean()
    if (!doc) doc = await FAQ.findOne().lean()
    if (!doc) return { items: [] }
    return toPlain({
      items: doc.items
        .filter((i) => i.status === "published")
        .sort((a, b) => a.order - b.order)
        .map((i) => ({ _id: String(i._id), question: i.question, answer: i.answer, category: i.category, order: i.order, status: i.status as import("@/types/cms").CMSStatus })),
    })
  } catch { return { items: [] } }
}

export async function getFooter(locale: Locale = "ka"): Promise<FooterData> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await FooterContent.findOne({ status: "published", locale: "en" }).lean() : null
    if (!doc) doc = await FooterContent.findOne({ status: "published", locale: { $ne: "en" } }).lean()
    if (!doc) return DEFAULT_FOOTER
    return toPlain(doc as unknown as FooterData)
  } catch { return DEFAULT_FOOTER }
}

export async function getLegalNotice(type: LegalNoticeType, locale: Locale = "ka"): Promise<LegalNoticeData | null> {
  try {
    await dbConnect()
    let doc = locale === "en" ? await LegalNotice.findOne({ type, status: "published", locale: "en" }).lean() : null
    if (!doc) doc = await LegalNotice.findOne({ type, status: "published", locale: { $ne: "en" } }).lean()
    if (!doc) return null
    return toPlain({
      _id: String(doc._id), type: doc.type as import("@/types/cms").LegalNoticeType, title: doc.title, body: doc.body,
      status: doc.status as import("@/types/cms").CMSStatus, publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    }) as LegalNoticeData
  } catch { return null }
}

export async function getPublishedBlogPosts(locale: Locale = "ka", limit = 20): Promise<BlogPostData[]> {
  try {
    await dbConnect()
    let docs = await BlogPost.find({ status: "published", ...localeMatch(locale) })
      .sort({ publishedAt: -1 }).limit(limit).lean()
    if (locale === "en" && docs.length === 0) {
      docs = await BlogPost.find({ status: "published", locale: { $ne: "en" } })
        .sort({ publishedAt: -1 }).limit(limit).lean()
    }
    return toPlain(docs.map((d) => ({
      _id: String(d._id), title: d.title, slug: d.slug, body: d.body,
      excerpt: d.excerpt, coverImageUrl: d.coverImageUrl, coverImagePubId: d.coverImagePubId,
      category: String(d.category), tags: d.tags, author: d.author, status: d.status as import("@/types/cms").CMSStatus,
      publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
      createdAt: (d as { createdAt?: Date }).createdAt?.toISOString() ?? "",
    })))
  } catch { return [] }
}

export async function getBlogPost(slug: string): Promise<BlogPostData | null> {
  try {
    await dbConnect()
    const doc = await BlogPost.findOne({ slug, status: "published" }).lean()
    if (!doc) return null
    return toPlain({
      _id: String(doc._id), title: doc.title, slug: doc.slug, body: doc.body,
      excerpt: doc.excerpt, coverImageUrl: doc.coverImageUrl, coverImagePubId: doc.coverImagePubId,
      category: String(doc.category), tags: doc.tags, author: doc.author, status: doc.status as import("@/types/cms").CMSStatus,
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
      createdAt: (doc as { createdAt?: Date }).createdAt?.toISOString() ?? "",
    }) as BlogPostData
  } catch { return null }
}
