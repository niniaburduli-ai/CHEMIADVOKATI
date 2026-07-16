"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { UpgradeButton } from "@/components/site/upgrade-button"
import { AnimateIn } from "@/components/site/AnimateIn"
import { effectivePriceMinor } from "@/lib/plan-price"
import type { PlanData } from "@/lib/plans-db"
import type { Locale } from "@/lib/i18n/config"
import { pick, pickArr } from "@/lib/i18n/loc"

type PricingStrings = {
  popular: string
  join: string
  start: string
  perMonth: string
}

type DisplayPlan = {
  id: string
  name: string
  price: string
  originalPrice: string | null
  discountPercent: number
  badge: string
  ctaText: string
  ctaHref: string
  planKey: string
  highlighted: boolean
  items: string[]
  isFree: boolean
}

function buildDisplayPlans(
  raw: PlanData[],
  locale: Locale,
  s: PricingStrings,
): DisplayPlan[] {
  return raw.map((p) => {
    const paid = !p.isFree && p.priceMinor > 0 && p.active
    const effectiveMinor = effectivePriceMinor(p)
    const hasDiscount = effectiveMinor < p.priceMinor
    const gel = effectiveMinor / 100
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
    const base = pickArr(p.features, p.featuresEn, locale)
    const gen = p.includeDocGeneration
      ? pickArr(p.featuresDocGeneration, p.featuresDocGenerationEn, locale)
      : []
    const rev = p.includeDocReview
      ? pickArr(p.featuresDocReview, p.featuresDocReviewEn, locale)
      : []
    const tpl = p.includeDocTemplates
      ? pickArr(p.featuresDocTemplates, p.featuresDocTemplatesEn, locale)
      : []
    return {
      id: p.id,
      name: pick(p.name, p.nameEn, locale),
      price: fmt(gel),
      originalPrice: hasDiscount ? fmt(p.priceMinor / 100) : null,
      discountPercent: hasDiscount ? Math.round((1 - effectiveMinor / p.priceMinor) * 100) : 0,
      badge: p.highlighted ? s.popular : "",
      ctaText: paid ? s.join : s.start,
      ctaHref: paid ? "/billing" : "/register",
      planKey: paid ? p.key : "",
      highlighted: p.highlighted,
      items: [base[0], ...tpl, ...gen, ...rev, ...base.slice(1)],
      isFree: p.isFree,
    }
  })
}

function gridCols(n: number) {
  if (n <= 1) return "grid-cols-1 max-w-sm mx-auto"
  if (n === 2) return "md:grid-cols-2 max-w-2xl mx-auto"
  return "md:grid-cols-3"
}

export function PricingSection({
  initialPlans,
  locale,
  strings,
  heading,
}: {
  initialPlans: PlanData[]
  locale: Locale
  strings: PricingStrings
  heading: string
}) {
  // Store raw PlanData so display is always computed from current locale/strings props.
  // Using useState<DisplayPlan[]> caused stale data after router.refresh() on locale switch
  // because React preserves client state across RSC re-renders.
  const [rawOverride, setRawOverride] = useState<PlanData[] | null>(null)
  const plans = buildDisplayPlans(rawOverride ?? initialPlans, locale, strings)

  async function refresh() {
    try {
      const res = await fetch("/api/plans", { cache: "no-store" })
      if (!res.ok) return
      const { plans: raw }: { plans: PlanData[] } = await res.json()
      setRawOverride(raw)
    } catch {
      // keep current state on network error
    }
  }

  useEffect(() => {
    // Refresh on tab focus so admin changes appear without a full page reload.
    function onVisible() {
      if (document.visibilityState === "visible") refresh()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [])

  if (plans.length === 0) return null

  return (
    <section className="container mx-auto px-4 py-16 max-w-5xl">
      {heading && (
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{heading}</h2>
          <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-gold mx-auto mt-4 rounded-full" />
        </div>
      )}
      <div className={`grid gap-6 ${gridCols(plans.length)} items-start`}>
        {plans.map((p, idx) => (
          <AnimateIn key={p.id} delay={idx * 100}>
            <div
              className={[
                "relative rounded-2xl border bg-card flex flex-col p-7 card-hover h-full",
                p.highlighted ? "border-2 border-gray-400 shadow-xl shadow-gray-400/10 z-10" : "border-border",
              ].join(" ")}
            >
              {p.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="text-slate-900 bg-gold text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap"
                  >
                    {p.badge}
                  </span>
                </div>
              )}

              <p className="font-bold text-base mb-4 text-primary">{p.name}</p>

              <div className="mb-6">
                {p.originalPrice && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg text-muted-foreground line-through">{p.originalPrice}₾</span>
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white whitespace-nowrap">
                      -{p.discountPercent}%
                    </span>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <span className={`text-5xl font-bold leading-none ${p.originalPrice ? "text-red-600" : "text-foreground"}`}>{p.price}</span>
                  <span className={`text-lg font-semibold mb-0.5 ${p.originalPrice ? "text-red-600" : "text-foreground"}`}>₾</span>
                  {!p.isFree && (
                    <span className="text-sm text-muted-foreground mb-1">{strings.perMonth}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-3 text-sm flex-1 mb-8">
                {p.items.map((item, ii) => (
                  <li key={ii} className="flex gap-2.5 items-start">
                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                    <span className="text-foreground/80 leading-snug">{item}</span>
                  </li>
                ))}
              </ul>

              {p.planKey ? (
                <UpgradeButton
                  plan={p.planKey}
                  label={p.ctaText}
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 btn-hover",
                    p.highlighted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border border-border text-primary hover:bg-primary/5",
                  ].join(" ")}
                />
              ) : (
                <Link
                  href={p.ctaHref}
                  className={[
                    "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors btn-hover",
                    p.highlighted
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "border border-border text-primary hover:bg-primary/5",
                  ].join(" ")}
                >
                  {p.ctaText}
                </Link>
              )}
            </div>
          </AnimateIn>
        ))}
      </div>
    </section>
  )
}
