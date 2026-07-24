import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

/**
 * robots.txt — allow public pages, block auth-gated + private areas that carry
 * no SEO value (and would waste crawl budget / expose app UI). Auth routes are
 * defined in auth.config.ts; keep this list in sync.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/profile",
        "/chat",
        "/billing",
        "/generate",
        "/templates",
        "/review",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
