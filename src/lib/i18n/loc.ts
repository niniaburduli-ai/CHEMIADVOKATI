import type { Locale } from "./config"

/** Pick a localized value from a base (ka) + optional en companion. */
export function pick(kaVal: string, enVal: string | undefined | null, locale: Locale): string {
  return locale === "en" && enVal ? enVal : kaVal
}

/** Pick a localized array (e.g. plan features) from base + optional en companion. */
export function pickArr(kaArr: string[], enArr: string[] | undefined | null, locale: Locale): string[] {
  return locale === "en" && enArr && enArr.length ? enArr : kaArr
}
