import { PricingSection } from "@/components/site/PricingSection";
import { CustomPlanBuilder } from "@/components/site/CustomPlanBuilder";
import { PageHero } from "@/components/site/PageHero";
import { getVisiblePlans } from "@/lib/plans-db";
import { getCustomPlanRatesFull } from "@/lib/custom-plan-rates";
import { STEP_QUANTITIES } from "@/lib/custom-plan-rates-config";
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
  const [plans, customRatesFull] = await Promise.all([getVisiblePlans(), getCustomPlanRatesFull()]);

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

      <section className="container mx-auto px-4 pb-16 max-w-md">
        <CustomPlanBuilder
          rates={customRatesFull.rates}
          discountRates={customRatesFull.discountRates}
          steps={STEP_QUANTITIES}
          services={[
            { key: "consultations", label: d.pricing.customConsultations },
            { key: "docTemplates", label: d.pricing.customTemplates },
            { key: "docGeneration", label: d.pricing.customDocGeneration },
            { key: "docReview", label: d.pricing.customDocAnalysis },
          ]}
          strings={{
            heading: d.pricing.customTitle,
            subtitle: d.pricing.customSubtitle,
            buildAndPay: d.pricing.customBuildAndPay,
            selectAtLeastOne: d.pricing.customSelectOne,
            checkoutError: d.pricing.customCheckoutError,
            networkError: d.pricing.customNetworkError,
          }}
        />
      </section>
    </div>
  );
}
