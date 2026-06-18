"use client"
import { useState } from "react"
import { CMSSidebar, type CMSSection } from "./CMSSidebar"
import { SiteConfigForm } from "./SiteConfigForm"
import { NavMenuForm } from "./NavMenuForm"
import { HomePageForm } from "./HomePageForm"
import { AboutPageForm } from "./AboutPageForm"
import { FAQForm } from "./FAQForm"
import { BlogPanel } from "./BlogPanel"
import { FooterForm } from "./FooterForm"
import { LegalNoticesForm } from "./LegalNoticesForm"
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config"

// Sections whose content is per-locale editable.
const LOCALIZED: CMSSection[] = ["site-config", "nav", "homepage", "footer"]

export function CMSPanel() {
  const [section, setSection] = useState<CMSSection>("site-config")
  const [locale, setLocale] = useState<Locale>("ka")

  const showLocale = LOCALIZED.includes(section)

  return (
    <div className="flex min-h-[600px] gap-0 rounded-lg border">
      <CMSSidebar active={section} onSelect={setSection} />
      <div className="flex-1 overflow-auto p-6">
        {showLocale && (
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">ენა:</span>
            <div className="flex items-center gap-0.5 rounded-md border p-0.5">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={[
                    "rounded px-3 py-1 text-xs font-medium transition-colors",
                    l === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        )}
        {section === "site-config" && <SiteConfigForm locale={locale} />}
        {section === "nav" && <NavMenuForm locale={locale} />}
        {section === "homepage" && <HomePageForm locale={locale} />}
        {section === "about" && <AboutPageForm />}
        {section === "faq" && <FAQForm />}
        {section === "blog" && <BlogPanel />}
        {section === "footer" && <FooterForm locale={locale} />}
        {section === "legal" && <LegalNoticesForm />}
      </div>
    </div>
  )
}
