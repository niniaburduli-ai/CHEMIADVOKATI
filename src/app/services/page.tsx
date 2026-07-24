export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { getFeatureFlags } from "@/lib/features"
import { getLocale } from "@/lib/i18n/locale"
import { getVisiblePlans } from "@/lib/plans-db"
import { ServicesPageClient } from "./services-client"
import { JsonLd } from "@/components/site/JsonLd"
import { buildMetadata, breadcrumbJsonLd, KEYWORDS_KA, KEYWORDS_EN } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isEn = locale === "en"
  return buildMetadata({
    title: isEn
      ? "Services — Contract Review, Generation & Risk Analysis"
      : "მომსახურებები — ხელშეკრულების შემოწმება, გენერირება, რისკების ანალიზი",
    description: isEn
      ? "AI lawyer services: contract review and generation, legal templates, risk analysis, and legal consultation based on Georgian law."
      : "AI იურისტის მომსახურებები: ხელშეკრულების შემოწმება და გენერირება, იურიდიული შაბლონები, რისკების ანალიზი და იურიდიული კონსულტაცია საქართველოს კანონმდებლობის საფუძველზე.",
    path: "/services",
    keywords: isEn
      ? ["contract review", "contract generation", "legal templates", "risk analysis", ...KEYWORDS_EN]
      : [
          "ხელშეკრულების შემოწმება",
          "ხელშეკრულების გენერირება",
          "იურიდიული შაბლონები",
          "რისკების ანალიზი",
          "ხელშეკრულების ანალიზი",
          "ხელშეკრულების შედგენა",
          ...KEYWORDS_KA,
        ],
    locale,
    bilingual: true,
  })
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; reviewId?: string }>
}) {
  const [locale, flags, plans, { tab, reviewId }] = await Promise.all([
    getLocale(),
    getFeatureFlags(),
    getVisiblePlans(),
    searchParams,
  ])
  const upgradePlan =
    plans.find((p) => p.highlighted && p.active) ?? plans.find((p) => !p.isFree && p.active) ?? null
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "მთავარი", path: "/" },
          { name: "მომსახურებები", path: "/services" },
        ])}
      />
      <ServicesPageClient
        locale={locale}
        flags={flags}
        upgradePlan={upgradePlan}
        initialTab={tab}
        initialReviewId={reviewId}
      />
    </>
  )
}
