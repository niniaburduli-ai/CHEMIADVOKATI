import Link from "next/link";
import { Check } from "lucide-react";
import { UpgradeButton } from "@/components/site/upgrade-button";
import { getVisiblePlans } from "@/lib/plans-db";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { pick, pickArr } from "@/lib/i18n/loc";

export const dynamic = "force-dynamic";

function formatPrice(minor: number, currency: string): string {
  if (minor === 0) return currency === "GEL" ? "0₾" : `0`;
  const v = (minor / 100).toLocaleString("ka-GE", { maximumFractionDigits: 2 });
  return currency === "GEL" ? `${v}₾` : `${v} ${currency}`;
}

export default async function PricingPage() {
  const locale = await getLocale();
  const d = getDict(locale);
  const plans = await getVisiblePlans();

  return (
    <div className="container mx-auto px-4 py-16 animate-fade-up">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight">{d.pricing.title}</h1>
        <p className="mt-4 text-muted-foreground">{d.pricing.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto items-start">
        {plans.map((p) => {
          const isPaid = !p.isFree && p.priceMinor > 0 && p.active;
          const name = pick(p.name, p.nameEn, locale);
          const desc = pick(p.description, p.descriptionEn, locale);
          const baseFeatures = pickArr(p.features, p.featuresEn, locale);
          const genFeatures = p.includeDocGeneration
            ? pickArr(p.featuresDocGeneration, p.featuresDocGenerationEn, locale)
            : [];
          const revFeatures = p.includeDocReview
            ? pickArr(p.featuresDocReview, p.featuresDocReviewEn, locale)
            : [];
          const features = [...baseFeatures, ...genFeatures, ...revFeatures];
          return (
            <div
              key={p.id}
              className={[
                "relative rounded-2xl border bg-card flex flex-col p-7 card-hover",
                p.highlighted
                  ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                  : "border-border",
              ].join(" ")}
            >
              {p.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap"
                    style={{
                      background:
                        "linear-gradient(90deg, oklch(0.366 0.165 264) 0%, oklch(0.48 0.19 255) 50%, oklch(0.366 0.165 264) 100%)",
                      backgroundSize: "200% auto",
                      animation: "shimmer 3s linear infinite",
                    }}
                  >
                    {d.pricing.popular}
                  </span>
                </div>
              )}
              <p className="font-bold text-base mb-1 text-primary">{name}</p>
              {desc && <p className="text-sm text-muted-foreground mb-4">{desc}</p>}
              <div className="flex items-end gap-1 mb-6">
                <span className="text-5xl font-bold text-foreground leading-none">
                  {formatPrice(p.priceMinor, p.currency)}
                </span>
                <span className="text-sm text-muted-foreground mb-1">
                  /{p.period === "month" ? d.pricing.perMonth : p.period}
                </span>
              </div>
              <ul className="space-y-3 text-sm flex-1 mb-8">
                {features.map((i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-foreground/80 leading-snug">{i}</span>
                  </li>
                ))}
              </ul>
              {isPaid ? (
                <UpgradeButton
                  plan={p.key}
                  label={d.pricing.join}
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors btn-hover",
                    p.highlighted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border border-border text-primary hover:bg-primary/5",
                  ].join(" ")}
                />
              ) : (
                <Link
                  href="/register"
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors btn-hover",
                    p.highlighted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border border-border text-primary hover:bg-primary/5",
                  ].join(" ")}
                >
                  {d.pricing.start}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto mt-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">{d.pricing.faqTitle}</h2>
        <div className="space-y-4">
          {d.pricing.faqs.map((f) => (
            <div key={f.q} className="bg-card border border-border rounded-2xl p-5 card-hover">
              <p className="font-bold text-sm">{f.q}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
