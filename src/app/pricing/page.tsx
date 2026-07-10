import { PricingSection } from "@/components/site/PricingSection";
import { PageHero } from "@/components/site/PageHero";
import { getVisiblePlans } from "@/lib/plans-db";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Metadata } from "next";
import { buildMetadata, KEYWORDS_KA } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "ფასები და პაკეტები — AI იურიდიული კონსულტაცია",
  description:
    "აირჩიეთ პაკეტი: AI იურიდიული კონსულტაცია, ხელშეკრულების შემოწმება და გენერირება, რისკების ანალიზი. უფასო პაკეტი ბარათის გარეშე.",
  path: "/pricing",
  keywords: ["იურიდიული კონსულტაცია ფასი", "ონლაინ იურისტი", ...KEYWORDS_KA],
});

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const locale = await getLocale();
  const d = getDict(locale);
  const plans = await getVisiblePlans();

  return (
    <div className="animate-fade-up">
      <PageHero title={d.pricing.title} subtitle={d.pricing.subtitle} />

      <PricingSection
        initialPlans={plans}
        locale={locale}
        strings={{
          popular: d.pricing.popular,
          join: d.pricing.join,
          start: d.pricing.start,
          perMonth: d.home.perMonth,
        }}
        heading=""
      />
    </div>
  );
}
