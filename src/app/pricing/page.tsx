import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <div className="container mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">{d.pricing.title}</h1>
        <p className="mt-4 text-muted-foreground">{d.pricing.subtitle}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {plans.map((p) => {
          const isPaid = !p.isFree && p.priceMinor > 0 && p.active;
          const name = pick(p.name, p.nameEn, locale);
          const desc = pick(p.description, p.descriptionEn, locale);
          const features = pickArr(p.features, p.featuresEn, locale);
          return (
            <Card
              key={p.id}
              className={p.highlighted ? "border-primary shadow-lg relative" : ""}
            >
              {p.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {d.pricing.popular}
                </Badge>
              )}
              <CardContent className="pt-6">
                <div className="text-lg font-semibold">{name}</div>
                {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{formatPrice(p.priceMinor, p.currency)}</span>
                  <span className="text-muted-foreground">
                    /{p.period === "month" ? d.pricing.perMonth : p.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {features.map((i) => (
                    <li key={i} className="flex gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{i}</span>
                    </li>
                  ))}
                </ul>
                {isPaid ? (
                  <UpgradeButton
                    plan={p.key}
                    label={d.pricing.join}
                    variant={p.highlighted ? "default" : "outline"}
                  />
                ) : (
                  <Link
                    href="/register"
                    className={buttonVariants({
                      variant: p.highlighted ? "default" : "outline",
                      className: "mt-6 w-full",
                    })}
                  >
                    {d.pricing.start}
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto mt-20">
        <h2 className="text-2xl font-bold text-center mb-8">{d.pricing.faqTitle}</h2>
        <div className="space-y-4">
          {d.pricing.faqs.map((f) => (
            <Card key={f.q}>
              <CardContent className="pt-5">
                <div className="font-medium">{f.q}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
