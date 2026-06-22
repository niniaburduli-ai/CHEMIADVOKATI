import Link from "next/link"
import {
  ShieldCheck, Clock, Check, ArrowRight,
  MessageSquare, FileText, FolderOpen,
  MousePointerClick, Zap, Layers, Users, Circle,
  type LucideIcon,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { UpgradeButton } from "@/components/site/upgrade-button"
import { getHomePage } from "@/lib/cms"
import { getVisiblePlans } from "@/lib/plans-db"
import { getFeatureFlags, isPathEnabled } from "@/lib/features"
import { getPublicStats, resolveMetric } from "@/lib/stats"
import { getLocale } from "@/lib/i18n/locale"
import { pick, pickArr } from "@/lib/i18n/loc"
import { HOME_SEED } from "@/lib/homepage-defaults"

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, FileText, FolderOpen, ArrowRight,
  Layers, Users, MousePointerClick, Zap, ShieldCheck, Clock, Circle,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}

function serviceCardsGrid(n: number) {
  if (n <= 1) return "grid-cols-1"
  if (n === 2) return "grid-cols-2"
  return "grid-cols-3"
}

function statsGrid(n: number) {
  if (n <= 1) return "grid-cols-1"
  if (n === 2) return "grid-cols-2"
  if (n === 3) return "grid-cols-2 md:grid-cols-3"
  return "grid-cols-2 md:grid-cols-4"
}

function featuresGrid(n: number) {
  if (n <= 1) return "grid-cols-1"
  if (n === 2) return "grid-cols-1 sm:grid-cols-2"
  if (n === 3) return "grid-cols-1 sm:grid-cols-3"
  if (n === 4) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
}

function pricingGrid(n: number) {
  if (n <= 1) return "grid-cols-1 max-w-sm mx-auto"
  if (n === 2) return "md:grid-cols-2 max-w-2xl mx-auto"
  return "md:grid-cols-3"
}

export default async function Home() {
  const locale = await getLocale()
  const [cms, flags, publicStats] = await Promise.all([
    getHomePage(locale),
    getFeatureFlags(),
    getPublicStats(),
  ])

  const sections  = cms?.sections  ?? HOME_SEED.sections
  const hero      = cms?.hero      ?? HOME_SEED.hero
  const ctaSection = cms?.ctaSection ?? HOME_SEED.ctaSection

  const serviceCards = ((cms?.serviceCards ?? HOME_SEED.serviceCards) as typeof HOME_SEED.serviceCards)
    .filter((c) => c.visible !== false)
    .filter((c) => isPathEnabled(c.href, flags))
    .sort((a, b) => a.order - b.order)

  const statsHeading = cms?.statsHeading || HOME_SEED.statsHeading
  const stats = ((cms?.stats ?? HOME_SEED.stats) as typeof HOME_SEED.stats)
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order)

  const featuresHeading = cms?.featuresHeading || HOME_SEED.featuresHeading
  const features = ((cms?.features ?? HOME_SEED.features) as typeof HOME_SEED.features)
    .filter((f) => f.visible !== false)
    .sort((a, b) => a.order - b.order)

  const pricingHeading = cms?.pricingHeading || HOME_SEED.pricingHeading
  // Pricing reads the single source of truth — the dynamic Plan collection —
  // so price/feature edits in the admin Plans tab show here immediately.
  const dbPlans = await getVisiblePlans()
  const plans = dbPlans.map((p) => {
    const paid = !p.isFree && p.priceMinor > 0 && p.active
    const gel = p.priceMinor / 100
    return {
      _id: p.id,
      name: pick(p.name, p.nameEn, locale),
      price: Number.isInteger(gel) ? String(gel) : gel.toFixed(2),
      badge: p.highlighted ? "პოპულარული" : "",
      ctaText: paid ? "შეუერთდი" : "დაიწყე",
      ctaHref: paid ? "/billing" : "/register",
      plan: paid ? p.key : "",
      highlighted: p.highlighted,
      visible: true,
      order: p.order,
      items: pickArr(p.features, p.featuresEn, locale),
    }
  })

  return (
    <div>
      {/* ── HERO ── */}
      {sections.hero !== false && (
        <section className="relative bg-gradient-to-br from-[#ededff] via-[#eef0ff] to-[#e8eaff]">
          <div className="container mx-auto px-4">
            {/* Two-column: cards left, image right */}
            <div className="flex flex-col lg:flex-row items-stretch min-h-[580px]">

              {/* ── LEFT 50%: heading + cards, vertically centered ── */}
              <div className="w-full lg:w-1/2 flex flex-col justify-center py-10 md:py-14 lg:pr-8">
                <div className="-mt-28">
                <h1 className="text-5xl md:text-7xl font-bold text-[#1a1a2e] leading-none mb-3 tracking-tight">
                  {hero.title || HOME_SEED.hero.title}
                </h1>
                <p className="text-3xl md:text-4xl text-[#4338ca] mb-8 font-semibold">
                  {hero.subtitle || HOME_SEED.hero.subtitle}
                </p>
                </div>

                <div className={`grid ${serviceCardsGrid(serviceCards.length)} gap-3`}>
                  {serviceCards.map((card) => {
                    const CardIcon = resolveIcon(card.icon)
                    if (card.comingSoon) {
                      return (
                        <div
                          key={card._id}
                          className="bg-white/60 border border-[#e0e0ff] rounded-2xl p-4 flex flex-col gap-2 cursor-default opacity-70"
                        >
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                              <CardIcon className="h-6 w-6 text-[#a5b4fc]" />
                            </div>
                            <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">
                              მალე
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#6b7280] text-lg leading-snug">{card.title}</p>
                            <p className="text-sm font-medium text-[#a5b4fc] mt-0.5">{card.subtitle}</p>
                          </div>
                          {card.description && (
                            <p className="text-sm text-gray-400 leading-relaxed flex-1">{card.description}</p>
                          )}
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                            {card.ctaText ?? "მალე"} <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      )
                    }
                    return (
                      <Link
                        key={card._id}
                        href={card.href}
                        className="bg-white border border-[#e0e0ff] rounded-2xl p-4 flex flex-col gap-2 hover:shadow-lg hover:-translate-y-1 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                          <CardIcon className="h-6 w-6 text-[#6366f1]" />
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1a2e] text-lg leading-snug">{card.title}</p>
                          <p className="text-sm font-semibold text-[#6366f1] mt-0.5">{card.subtitle}</p>
                        </div>
                        {card.description && (
                          <p className="text-sm text-gray-500 leading-relaxed flex-1">{card.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4338ca] group-hover:gap-2.5 transition-all">
                          {card.ctaText ?? "გაიგე მეტი"} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* ── RIGHT 50%: image, bottom-anchored, no bottom padding ── */}
              <div className="hidden lg:flex lg:w-1/2 items-end justify-center pt-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kartlis_deda_5.png"
                  alt="ქართლის დედა სასწორით"
                  className="max-h-[640px] w-auto mix-blend-multiply"
                />
              </div>

            </div>
          </div>
        </section>
      )}

      {/* ── STATS ── */}
      {sections.stats !== false && stats.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-10">
            {statsHeading}
          </h2>
          <div className={`grid ${statsGrid(stats.length)} gap-4`}>
            {stats.map((s) => {
              const StatIcon = resolveIcon(s.icon)
              // Live count when the card is bound (or inferable) to a metric; else manual value.
              const metric = resolveMetric(s.metric, s.label)
              const display = metric ? publicStats[metric].toLocaleString("ka-GE") : s.value
              return (
                <div
                  key={s._id}
                  className="bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-6 py-7 flex items-center gap-4"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                    <StatIcon className="h-6 w-6 text-[#6366f1]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[#3730a3] leading-none">{display}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── FEATURES / WHY ── */}
      {sections.features !== false && features.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-12">
            {featuresHeading}
          </h2>
          <div className={`grid ${featuresGrid(features.length)} gap-4`}>
            {features.map((f, idx) => {
              const FIcon = resolveIcon(f.icon)
              return (
                <div key={f._id} className="bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-5 py-6 flex flex-col items-center text-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                    <FIcon className="h-6 w-6 text-[#6366f1]" />
                  </div>
                  <p className="font-bold text-[#3730a3] text-sm leading-snug">
                    {idx + 1}. {f.title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── PRICING ── */}
      {sections.pricing !== false && plans.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-[#1a1a2e] mb-12">
            {pricingHeading}
          </h2>
          <div className={`grid gap-6 ${pricingGrid(plans.length)} items-start`}>
            {plans.map((p) => (
              <div
                key={p._id}
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

                <p className={["font-bold text-base mb-4", p.highlighted ? "text-[#4338ca]" : "text-[#3730a3]"].join(" ")}>
                  {p.name}
                </p>

                <div className="flex items-end gap-1 mb-6">
                  <span className="text-5xl font-bold text-[#1a1a2e] leading-none">{p.price}</span>
                  <span className="text-lg font-semibold text-[#1a1a2e] mb-0.5">₾</span>
                  <span className="text-sm text-gray-400 mb-1">/ თვეში</span>
                </div>

                <ul className="space-y-3 text-sm flex-1 mb-8">
                  {p.items.map((item, ii) => (
                    <li key={ii} className="flex gap-2.5 items-start">
                      <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#6366f1]" />
                      <span className="text-gray-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>

                {p.plan ? (
                  <UpgradeButton
                    plan={p.plan}
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
      )}

      {/* ── CTA ── */}
      {sections.cta !== false && (
        <section className="container mx-auto px-4 py-20 text-center max-w-2xl">
          <h2 className="text-3xl font-bold">{ctaSection.title || HOME_SEED.ctaSection.title}</h2>
          <p className="mt-3 text-muted-foreground">{ctaSection.subtitle}</p>
          <Link
            href={ctaSection.buttonHref || HOME_SEED.ctaSection.buttonHref}
            className={buttonVariants({ size: "lg", className: "mt-6" })}
          >
            {ctaSection.buttonText || HOME_SEED.ctaSection.buttonText}
          </Link>
        </section>
      )}
    </div>
  )
}
