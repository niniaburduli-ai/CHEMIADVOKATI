import "server-only"
import { cookies, headers } from "next/headers"
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config"

/** Internal request header set by middleware.ts when a /en URL was rewritten. */
export const URL_LOCALE_HEADER = "x-url-locale"

/**
 * Active locale for the current request. A URL-derived locale (from the /en
 * prefix, via middleware.ts) takes precedence so crawlers hitting /en/... get
 * English regardless of any stale locale cookie; otherwise falls back to the
 * NEXT_LOCALE cookie set by the in-app language switcher.
 */
export async function getLocale(): Promise<Locale> {
  const hdrs = await headers()
  const urlLocale = hdrs.get(URL_LOCALE_HEADER)
  if (urlLocale) return normalizeLocale(urlLocale)
  const store = await cookies()
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value)
}
