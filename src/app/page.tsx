import Link from "next/link"
import {
  ShieldCheck, Clock, ArrowRight,
  MessageSquare, FileText, FolderOpen,
  MousePointerClick, Zap, Layers, Users, Circle,
  type LucideIcon,
} from "lucide-react"
import { PricingSection } from "@/components/site/PricingSection"
import { getHomePage } from "@/lib/cms"
import { getVisiblePlans } from "@/lib/plans-db"
import { getFeatureFlags, isPathEnabled } from "@/lib/features"
import { getPublicStats, resolveMetric } from "@/lib/stats"
import { getLocale } from "@/lib/i18n/locale"
import { pick } from "@/lib/i18n/loc"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { getDict } from "@/lib/i18n/dictionaries"

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, FileText, FolderOpen, ArrowRight,
  Layers, Users, MousePointerClick, Zap, ShieldCheck, Clock, Circle,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
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

export const dynamic = "force-dynamic"

export default async function Home() {
  const locale = await getLocale()
  const d = getDict(locale)
  const seed = getHomeSeed()
  const [cmsData, flags, publicStats] = await Promise.all([
    getHomePage(),
    getFeatureFlags(),
    getPublicStats(),
  ])
  const dbPlans = await getVisiblePlans()

  // Seed lookup maps for En fallback when CMS doc predates bilingual fields
  const seedCardById = new Map(seed.serviceCards.map((c) => [c._id, c]))
  const seedStatById = new Map(seed.stats.map((s) => [s._id, s]))
  const seedFeatureById = new Map(seed.features.map((f) => [f._id, f]))

  const sections = cmsData?.sections ?? seed.sections

  // ── Hero ─────────────────────────────────────────────────────────────────────
  const cmsHero = cmsData?.hero ?? seed.hero
  const heroTitle    = pick(cmsHero.title    || seed.hero.title,    cmsHero.titleEn    || seed.hero.titleEn,    locale)
  const heroSubtitle = pick(cmsHero.subtitle || seed.hero.subtitle, cmsHero.subtitleEn || seed.hero.subtitleEn, locale)

  // ── Service cards ─────────────────────────────────────────────────────────────
  const allServiceCards = (cmsData?.serviceCards ?? seed.serviceCards)
    .sort((a, b) => a.order - b.order)
  const visibleHrefs = new Set(
    allServiceCards
      .filter((c) => c.visible !== false)
      .filter((c) => isPathEnabled(c.href, flags))
      .map((c) => c.href),
  )

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = (cmsData?.stats ?? seed.stats)
    .filter((s) => s.visible !== false)
    .sort((a, b) => a.order - b.order)

  const statsHeading = pick(
    cmsData?.statsHeading    || seed.statsHeading,
    cmsData?.statsHeadingEn  || seed.statsHeadingEn,
    locale,
  )

  // ── Features ──────────────────────────────────────────────────────────────────
  const features = (cmsData?.features ?? seed.features)
    .filter((f) => f.visible !== false)
    .sort((a, b) => a.order - b.order)

  const featuresHeading = pick(
    cmsData?.featuresHeading   || seed.featuresHeading,
    cmsData?.featuresHeadingEn || seed.featuresHeadingEn,
    locale,
  )

  // ── Pricing heading ───────────────────────────────────────────────────────────
  const pricingHeading = pick(
    cmsData?.pricingHeading   || seed.pricingHeading,
    cmsData?.pricingHeadingEn || seed.pricingHeadingEn,
    locale,
  )

  // ── CTA ───────────────────────────────────────────────────────────────────────
  const cmsCta = cmsData?.ctaSection ?? seed.ctaSection
  const ctaTitle      = pick(cmsCta.title      || seed.ctaSection.title,      cmsCta.titleEn      || seed.ctaSection.titleEn,      locale)
  const ctaSubtitle   = pick(cmsCta.subtitle   || seed.ctaSection.subtitle,   cmsCta.subtitleEn   || seed.ctaSection.subtitleEn,   locale)
  const ctaButtonText = pick(cmsCta.buttonText || seed.ctaSection.buttonText, cmsCta.buttonTextEn || seed.ctaSection.buttonTextEn, locale)
  const ctaButtonHref = cmsCta.buttonHref || seed.ctaSection.buttonHref

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
                  {heroTitle}
                </h1>
                <p className="text-3xl md:text-4xl text-[#4338ca] mb-8 font-semibold">
                  {heroSubtitle}
                </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {allServiceCards.map((card) => {
                    if (!visibleHrefs.has(card.href)) {
                      return <div key={card._id} className="invisible" aria-hidden="true" />
                    }
                    const CardIcon = resolveIcon(card.icon)
                    const seedCard = seedCardById.get(card._id)
                    const cardTitle    = pick(card.title,    card.titleEn    || seedCard?.titleEn,    locale)
                    const cardSubtitle = pick(card.subtitle, card.subtitleEn || seedCard?.subtitleEn, locale)
                    const cardCta      = pick(card.ctaText || seedCard?.ctaText || "", card.ctaTextEn || seedCard?.ctaTextEn, locale) || d.home.learnMore

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
                              {d.home.comingSoon}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-[#6b7280] text-lg leading-snug">{cardTitle}</p>
                            <p className="text-sm font-medium text-[#a5b4fc] mt-0.5">{cardSubtitle}</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400">
                            {cardCta} <ArrowRight className="h-4 w-4" />
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
                          <p className="font-bold text-[#1a1a2e] text-lg leading-snug">{cardTitle}</p>
                          <p className="text-sm font-semibold text-[#6366f1] mt-0.5">{cardSubtitle}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#4338ca] group-hover:gap-2.5 transition-all">
                          {cardCta} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
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
                  alt={d.home.imageAlt}
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
              const metric = resolveMetric(s.metric, s.label)
              const display = metric ? publicStats[metric].toLocaleString("ka-GE") : s.value
              const seedStat = seedStatById.get(s._id)
              const statLabel = pick(s.label, s.labelEn || seedStat?.labelEn, locale)
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
                    <p className="text-xs text-gray-500 mt-1 leading-snug">{statLabel}</p>
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
              const seedFeature = seedFeatureById.get(f._id)
              const featureTitle = pick(f.title, f.titleEn || seedFeature?.titleEn, locale)
              const featureBody  = pick(f.body,  f.bodyEn  || seedFeature?.bodyEn,  locale)
              return (
                <div key={f._id} className="bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-5 py-6 flex flex-col items-center text-center gap-3">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                    <FIcon className="h-6 w-6 text-[#6366f1]" />
                  </div>
                  <p className="font-bold text-[#3730a3] text-sm leading-snug">
                    {idx + 1}. {featureTitle}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{featureBody}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── PRICING ── */}
      {sections.pricing !== false && (
        <PricingSection
          initialPlans={dbPlans}
          locale={locale}
          strings={{
            popular: d.pricing.popular,
            join: d.pricing.join,
            start: d.pricing.start,
            perMonth: d.home.perMonth,
          }}
          heading={pricingHeading}
        />
      )}

      {/* ── CTA ── */}
      {sections.cta !== false && (
        <section className="container mx-auto px-4 py-20 text-center max-w-2xl">
          <h2 className="text-3xl font-bold">{ctaTitle}</h2>
          <p className="mt-3 text-muted-foreground">{ctaSubtitle}</p>
          <Link
            href={ctaButtonHref}
            className="mt-6 inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold bg-[#4338ca] hover:bg-[#3730a3] text-white transition-colors"
          >
            {ctaButtonText}
          </Link>
        </section>
      )}
    </div>
  )
}
