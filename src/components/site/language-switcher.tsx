"use client"

import { useRouter } from "next/navigation"
import { Languages } from "lucide-react"
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config"

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter()

  function setLocale(locale: Locale) {
    if (locale === current) return
    // Persist the choice as a cookie (read server-side via getLocale), then refresh.
    // eslint-disable-next-line react-hooks/immutability -- document.cookie is a DOM write in an event handler
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5 text-xs">
      <Languages className="mx-1 h-3.5 w-3.5 text-muted-foreground" />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={[
            "rounded px-2 py-0.5 font-medium uppercase transition-colors",
            l === current ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
