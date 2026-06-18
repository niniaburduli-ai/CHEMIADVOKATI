import type { NextRequest } from "next/server"
import { normalizeLocale, type Locale } from "@/lib/i18n/config"

/** Locale from a CMS admin request's ?locale= param (defaults to ka). */
export function reqLocale(req: NextRequest): Locale {
  return normalizeLocale(req.nextUrl.searchParams.get("locale"))
}

/** Mongo filter for a locale's doc (ka = anything not "en"). */
export function localeFilter(locale: Locale) {
  return locale === "en" ? { locale: "en" } : { locale: { $ne: "en" } }
}
