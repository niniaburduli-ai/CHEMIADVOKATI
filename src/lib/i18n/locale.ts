import "server-only"
import { cookies } from "next/headers"
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "./config"

/** Active locale for the current request, from the NEXT_LOCALE cookie. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value)
}
