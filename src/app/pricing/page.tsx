import { PricingSection } from "@/components/site/PricingSection";
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
      <div className="container mx-auto px-4 pt-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">{d.pricing.title}</h1>
          <p className="mt-4 text-muted-foreground">{d.pricing.subtitle}</p>
        </div>
      </div>

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
