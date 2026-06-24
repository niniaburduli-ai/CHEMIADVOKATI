"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { UpgradeButton } from "@/components/site/upgrade-button"
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
  badge: string
  ctaText: string
  ctaHref: string
  planKey: string
  highlighted: boolean
  items: string[]
}

function buildDisplayPlans(
  raw: PlanData[],
  locale: Locale,
  s: PricingStrings,
): DisplayPlan[] {
  return raw.map((p) => {
    const paid = !p.isFree && p.priceMinor > 0 && p.active
    const gel = p.priceMinor / 100
    const base = pickArr(p.features, p.featuresEn, locale)
    const gen = p.includeDocGeneration
      ? pickArr(p.featuresDocGeneration, p.featuresDocGenerationEn, locale)
      : []
    const rev = p.includeDocReview
      ? pickArr(p.featuresDocReview, p.featuresDocReviewEn, locale)
      : []
    return {
      id: p.id,
      name: pick(p.name, p.nameEn, locale),
      price: Number.isInteger(gel) ? String(gel) : gel.toFixed(2),
      badge: p.highlighted ? s.popular : "",
      ctaText: paid ? s.join : s.start,
      ctaHref: paid ? "/billing" : "/register",
      planKey: paid ? p.key : "",
      highlighted: p.highlighted,
      items: [base[0], ...gen, ...rev, ...base.slice(1)],
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
    <section className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
      <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-12">
        {heading}
      </h2>
      <div className={`grid gap-6 ${gridCols(plans.length)} items-start`}>
        {plans.map((p) => (
          <div
            key={p.id}
            className={[
              "relative rounded-2xl border bg-white flex flex-col p-7",
              p.highlighted
                ? "border-[#6366f1] shadow-lg shadow-indigo-100"
                : "border-[#e5e7eb]",
            ].join(" ")}
          >
            {p.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#6366f1] text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                  {p.badge}
                </span>
              </div>
            )}

            <p
              className={[
                "font-bold text-base mb-4",
                p.highlighted ? "text-[#4338ca]" : "text-[#3730a3]",
              ].join(" ")}
            >
              {p.name}
            </p>

            <div className="flex items-end gap-1 mb-6">
              <span className="text-5xl font-bold text-[#1a1a2e] leading-none">{p.price}</span>
              <span className="text-lg font-semibold text-[#1a1a2e] mb-0.5">₾</span>
              <span className="text-sm text-gray-400 mb-1">{strings.perMonth}</span>
            </div>

            <ul className="space-y-3 text-sm flex-1 mb-8">
              {p.items.map((item, ii) => (
                <li key={ii} className="flex gap-2.5 items-start">
                  <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#6366f1]" />
                  <span className="text-gray-700 leading-snug">{item}</span>
                </li>
              ))}
            </ul>

            {p.planKey ? (
              <UpgradeButton
                plan={p.planKey}
                label={p.ctaText}
                className={[
                  "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60",
                  p.highlighted
                    ? "bg-[#4338ca] hover:bg-[#3730a3] text-white"
                    : "border border-[#c7d2fe] text-[#4338ca] hover:bg-[#ededff]",
                ].join(" ")}
              />
            ) : (
              <Link
                href={p.ctaHref}
                className={[
                  "w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors",
                  p.highlighted
                    ? "bg-[#4338ca] hover:bg-[#3730a3] text-white"
                    : "border border-[#c7d2fe] text-[#4338ca] hover:bg-[#ededff]",
                ].join(" ")}
              >
                {p.ctaText}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
