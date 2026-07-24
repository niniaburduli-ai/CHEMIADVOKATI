import type { Metadata } from "next"
import { getLocale } from "@/lib/i18n/locale"
import { getDict } from "@/lib/i18n/dictionaries"
import { PageHero } from "@/components/site/PageHero"
import { LegislationClient } from "./legislation-client"
import { JsonLd } from "@/components/site/JsonLd"
import { buildMetadata, breadcrumbJsonLd, KEYWORDS_KA, KEYWORDS_EN } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isEn = locale === "en"
  return buildMetadata({
    title: isEn ? "Legislation — Know Your Rights, Traffic Fines" : "კანონმდებლობა — რისი უფლება მაქვს, მანქანის ჯარიმები",
    description: isEn
      ? "Georgian law in plain language: know your rights, traffic fines, legal advice, and consultation from an AI lawyer."
      : "საქართველოს კანონმდებლობა მარტივ ენაზე: რისი უფლება მაქვს, მანქანის ჯარიმები, სამართლებრივი რჩევები და იურიდიული კონსულტაცია AI იურისტისგან.",
    path: "/legislation",
    keywords: isEn
      ? ["legislation", "Georgian law", "know your rights", "traffic fines", "legal advice", ...KEYWORDS_EN]
      : [
          "კანონმდებლობა",
          "საქართველოს კანონმდებლობა",
          "რისი უფლება მაქვს",
          "მანქანის ჯარიმები",
          "სამართლებრივი რჩევა",
          ...KEYWORDS_KA,
        ],
    locale,
    bilingual: true,
  })
}

export default async function LegislationPage() {
  const locale = await getLocale()
  const d = getDict(locale)
  return (
    <div>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "მთავარი", path: "/" },
          { name: "კანონმდებლობა", path: "/legislation" },
        ])}
      />
      <PageHero title={d.legislation.title} subtitle={d.legislation.subtitle} />
      <LegislationClient locale={locale} />
    </div>
  )
}
