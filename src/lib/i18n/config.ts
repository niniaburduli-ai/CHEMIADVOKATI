/** Client-safe i18n constants (no next/headers import). */
export const LOCALES = ["ka", "en"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "ka"
export const LOCALE_COOKIE = "NEXT_LOCALE"

export const LOCALE_LABELS: Record<Locale, string> = {
  ka: "ქართული",
  en: "English",
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "ka"
}
