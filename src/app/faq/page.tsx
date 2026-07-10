import type { Metadata } from "next"
import { getFAQ } from "@/lib/cms"
import { getLocale } from "@/lib/i18n/locale"
import { pick } from "@/lib/i18n/loc"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { getDict } from "@/lib/i18n/dictionaries"
import { PageHero } from "@/components/site/PageHero"
import { FaqCarousel } from "@/components/site/FaqCarousel"
import { JsonLd } from "@/components/site/JsonLd"
import { buildMetadata, faqJsonLd, KEYWORDS_KA } from "@/lib/seo"

export const metadata: Metadata = buildMetadata({
  title: "ხშირად დასმული კითხვები — AI იურიდიული კონსულტაცია",
  description:
    "პასუხები ხშირად დასმულ კითხვებზე „ჩემი იურისტი“-ს შესახებ — AI კონსულტაცია, პაკეტები და გამოწერა.",
  path: "/faq",
  keywords: KEYWORDS_KA,
})

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
