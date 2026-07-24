import type { Metadata } from "next"

/**
 * Central SEO config. All canonical URLs, keyword targets, and structured-data
 * builders live here so pages stay consistent and the target keyword set (the
 * one tracked in Wincher) is applied uniformly.
 *
 * Canonical origin is driven by NEXT_PUBLIC_SITE_URL — set it to the real
 * production domain in every environment. Wrong value = wrong canonicals.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chemiiuristi.com"
).replace(/\/$/, "")

export const SITE_NAME_KA = "ჩემი იურისტი"
export const SITE_NAME_EN = "Chemi Iuristi — My Lawyer"
export const TWITTER_HANDLE = "" // set if/when a handle exists

/**
 * Target keywords. Georgian primary (default crawl locale) + English mirror +
 * high-intent long-tail. Order roughly = priority. Keep the head terms here in
 * sync with the Wincher tracked-keyword list.
 */
/** Brand terms — highest priority. Must rank #1 for the site's own name. */
export const BRAND_KEYWORDS = [
  "ჩემი იურისტი",
  "იურისტი",
  "იურისტი ონლაინ",
  "ონლაინ იურისტი",
  "იურისტი საქართველო",
  // Latin transliterations (people type the brand in Latin too)
  "chemi iuristi",
  "iuristi",
  "chemiiuristi",
  "chemi iuristi online",
  "chemi advokati",
] as const

export const KEYWORDS_KA = [
  // brand first
  "ჩემი იურისტი",
  "იურისტი",
  "იურისტი ონლაინ",
  "ონლაინ იურისტი",
  // core services
  "იურიდიული კონსულტაცია",
  "ხელშეკრულების შემოწმება",
  "ხელშეკრულების გენერირება",
  "AI იურისტი",
  "AI ადვოკატი",
  "იურიდიული რჩევები",
  "იურიდიული შაბლონები",
  "კანონმდებლობა",
  "რისკების ანალიზი",
  "მანქანის ჯარიმები",
  "რისი უფლება მაქვს",
  // related / long-tail
  "იურიდიული დახმარება",
  "ადვოკატის კონსულტაცია",
  "ხელშეკრულების შედგენა",
  "ხელშეკრულების ანალიზი",
  "სამართლებრივი რჩევა",
  "საქართველოს კანონმდებლობა",
  "იურიდიული დოკუმენტები",
  "ხელოვნური ინტელექტი იურისტი",
  "იურისტის კონსულტაცია",
  "ადვოკატი ონლაინ",
] as const

export const KEYWORDS_EN = [
  // brand / transliteration
  "chemi iuristi",
  "iuristi",
  "chemiiuristi",
  "chemi advokati",
  // services
  "legal consultation",
  "contract review",
  "contract generation",
  "AI lawyer",
  "AI attorney",
  "legal advice",
  "legal templates",
  "legislation",
  "risk analysis",
  "traffic fines",
  "know your rights",
  "online lawyer",
  "legal help Georgia",
  "Georgian law",
  "legal documents",
] as const

export const DEFAULT_KEYWORDS: string[] = [...KEYWORDS_KA, ...KEYWORDS_EN]

/** Absolute URL from a site-relative path. */
export function absUrl(path = "/"): string {
  return path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

type BuildMetaOpts = {
  title: string
  description: string
  /** Site-relative path, e.g. "/services". Used for canonical + og:url. */
  path?: string
  keywords?: readonly string[]
  /** Absolute or site-relative OG image. Defaults to the site-wide generated card. */
  image?: string
  /** "website" (default) or "article" for blog posts. */
  type?: "website" | "article"
  publishedTime?: string
  noindex?: boolean
}

/**
 * Build a page Metadata object with canonical, OpenGraph, and Twitter tags
 * wired consistently. title is used as-is (root layout supplies the template).
 */
export function buildMetadata(opts: BuildMetaOpts): Metadata {
  const {
    title,
    description,
    path = "/",
    keywords,
    image,
    type = "website",
    publishedTime,
    noindex,
  } = opts

  const url = absUrl(path)
  const ogImage = image ? absUrl(image) : undefined // undefined => inherits layout opengraph-image

  return {
    title,
    description,
    keywords: keywords ? [...keywords] : DEFAULT_KEYWORDS,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: SITE_NAME_KA,
      locale: "ka_GE",
      alternateLocale: ["en_US"],
      ...(publishedTime ? { publishedTime } : {}),
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  }
}

/* ------------------------------------------------------------------ */
/* JSON-LD structured data                                            */
/* ------------------------------------------------------------------ */

/** Organization + LegalService — describes the business to search engines. */
export function organizationJsonLd(sameAs?: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LegalService"],
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME_KA,
    alternateName: SITE_NAME_EN,
    url: SITE_URL,
    logo: absUrl("/icon"),
    image: absUrl("/opengraph-image"),
    description:
      "AI იურისტი — ხელმისაწვდომი იურიდიული კონსულტაცია, ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი საქართველოს კანონმდებლობის საფუძველზე.",
    areaServed: { "@type": "Country", name: "Georgia" },
    availableLanguage: ["ka", "en"],
    knowsLanguage: ["ka", "en"],
    serviceType: [
      "იურიდიული კონსულტაცია",
      "ხელშეკრულების შემოწმება",
      "ხელშეკრულების გენერირება",
      "რისკების ანალიზი",
    ],
    ...(sameAs && sameAs.length ? { sameAs } : {}),
  }
}

/** WebSite + SearchAction — enables the sitelinks search box in Google. */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME_KA,
    alternateName: SITE_NAME_EN,
    inLanguage: "ka",
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/legislation?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  }
}

/** FAQPage — makes the homepage FAQ eligible for rich results. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  if (!items.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  }
}

/** BreadcrumbList — helps Google render breadcrumb trails in results. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: absUrl(t.path),
    })),
  }
}

/** Article — for blog posts. */
export function articleJsonLd(opts: {
  title: string
  description: string
  path: string
  image?: string
  datePublished?: string | null
  dateModified?: string | null
  author?: string
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(opts.path) },
    image: opts.image ? [absUrl(opts.image)] : [absUrl("/opengraph-image")],
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: { "@type": opts.author ? "Person" : "Organization", name: opts.author || SITE_NAME_KA },
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "ka",
  }
}

/** Small helper to render a JSON-LD <script> in a server component. */
export function jsonLdScript(data: object | null): string {
  return data ? JSON.stringify(data) : ""
}
