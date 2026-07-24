import type { Metadata } from "next"
import { getFAQ } from "@/lib/cms"
import { getLocale } from "@/lib/i18n/locale"
import { pick } from "@/lib/i18n/loc"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { getDict } from "@/lib/i18n/dictionaries"
import { PageHero } from "@/components/site/PageHero"
import { FaqCarousel } from "@/components/site/FaqCarousel"
import { JsonLd } from "@/components/site/JsonLd"
import { buildMetadata, faqJsonLd, KEYWORDS_KA, KEYWORDS_EN } from "@/lib/seo"

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isEn = locale === "en"
  return buildMetadata({
    title: isEn ? "FAQ — AI Legal Consultation" : "ხშირად დასმული კითხვები — AI იურიდიული კონსულტაცია",
    description: isEn
      ? "Answers to frequently asked questions about Chemi Iuristi — AI consultation, plans, and subscriptions."
      : "პასუხები ხშირად დასმულ კითხვებზე „ჩემი იურისტი“-ს შესახებ — AI კონსულტაცია, პაკეტები და გამოწერა.",
    path: "/faq",
    keywords: isEn ? [...KEYWORDS_EN] : [...KEYWORDS_KA],
    locale,
    bilingual: true,
  })
}

export const dynamic = "force-dynamic"

export default async function FaqPage() {
  const locale = await getLocale()
  const seed = getHomeSeed()
  const d = getDict(locale)
  const faqData = await getFAQ(locale)
  const heading = pick(seed.faqHeading, seed.faqHeadingEn, locale)

  return (
    <div>
      <PageHero
        title={heading}
        subtitle="მოძებნეთ თქვენთვის საჭირო კითხვაზე პასუხი ან მოგვწერეთ უკუკავშირის ღილაკით"
      />

      {faqData.items.length > 0 && (
        <section className="bg-background overflow-hidden">
          <JsonLd data={faqJsonLd(faqData.items.map((i) => ({ q: i.question, a: i.answer })))} />
          <div className="container mx-auto px-4 py-14">
            <FaqCarousel items={faqData.items} labels={d.faq} />
          </div>
        </section>
      )}
    </div>
  )
}
