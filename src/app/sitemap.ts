import type { MetadataRoute } from "next"
import { SITE_URL, PUBLIC_ROUTES, enPath } from "@/lib/seo"

/**
 * Public, indexable routes only. Auth-gated pages (dashboard, chat, generate,
 * review, billing, profile, admin, auth) are intentionally excluded — they are
 * also disallowed in robots.ts. Route list (incl. which ones are bilingual)
 * lives in lib/seo.ts so this stays in sync with middleware.ts's /en rewriting.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  return PUBLIC_ROUTES.flatMap((r) => {
    const kaEntry: MetadataRoute.Sitemap[number] = {
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      ...(r.bilingual
        ? { alternates: { languages: { ka: `${SITE_URL}${r.path}`, en: `${SITE_URL}${enPath(r.path)}` } } }
        : {}),
    }
    if (!r.bilingual) return [kaEntry]

    const enEntry: MetadataRoute.Sitemap[number] = {
      url: `${SITE_URL}${enPath(r.path)}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
      alternates: { languages: { ka: `${SITE_URL}${r.path}`, en: `${SITE_URL}${enPath(r.path)}` } },
    }
    return [kaEntry, enEntry]
  })
}
