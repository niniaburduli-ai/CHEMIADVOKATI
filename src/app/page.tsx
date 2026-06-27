import Link from "next/link"
import {
  ShieldCheck, Clock, ArrowRight,
  MessageSquare, FileText, FolderOpen,
  MousePointerClick, Zap, Layers, Users, Circle,
  type LucideIcon,
} from "lucide-react"
import { AnimateIn } from "@/components/site/AnimateIn"
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

  const cardsHeading = pick(
    cmsData?.cardsHeading   || seed.cardsHeading,
    cmsData?.cardsHeadingEn || seed.cardsHeadingEn,
    locale,
  )

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
        <section className="relative overflow-hidden bg-primary">
          {/* Statue as background — invert turns white→black (screen removes it), warm filters push to gold */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-[62%] flex items-end justify-center pointer-events-none select-none animate-float-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kartlis_deda_5.png"
              alt=""
              aria-hidden="true"
              className="h-full w-auto object-contain opacity-[0.96] mix-blend-screen"
              style={{ filter: "invert(1) sepia(1) saturate(4.2) hue-rotate(6deg) contrast(1.6) brightness(1.08) drop-shadow(0 0 40px oklch(0.65 0.13 78 / 0.4))" }}
            />
          </div>
          {/* Gradient: solid on text side, fades out by 55% so statue is fully visible on the right */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary from-[30%] via-primary/80 via-[50%] to-transparent pointer-events-none" />

          <div className="relative container mx-auto px-4">
            <div className="flex flex-col justify-center min-h-[560px] py-12 lg:py-16 max-w-[620px]">
              <h1 className="text-[58px] sm:text-[68px] lg:text-[76px] font-bold text-white leading-none tracking-tight mb-5 whitespace-nowrap animate-fade-up">
                {heroTitle}
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-gold leading-snug animate-fade-up delay-150">
                {heroSubtitle}
              </p>
              <div className="mt-auto pt-10 animate-fade-up delay-400" aria-hidden="true">
                <svg
                  viewBox="0 0 120 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-20 h-20 lg:w-28 lg:h-28 text-gold opacity-80"
                >
                  {/* Fixed: center post */}
                  <line x1="60" y1="28" x2="60" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  {/* Fixed: base */}
                  <line x1="42" y1="85" x2="78" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  {/* Fixed: fulcrum dot */}
                  <circle cx="60" cy="28" r="3.5" fill="currentColor" />
                  {/* Animated: beam + chains + pans — rotates around fulcrum (center top of bounding box) */}
                  <g className="animate-scale-sway">
                    {/* Beam */}
                    <line x1="18" y1="28" x2="102" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Left chain */}
                    <line x1="18" y1="28" x2="18" y2="57" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Left pan */}
                    <path d="M 6 57 Q 18 68 30 57" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Right chain */}
                    <line x1="102" y1="28" x2="102" y2="57" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Right pan */}
                    <path d="M 90 57 Q 102 68 114 57" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE CARDS ── */}
      {sections.hero !== false && (
        <section className="container mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
            {cardsHeading}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {allServiceCards.map((card, idx) => {
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
                  <AnimateIn key={card._id} delay={idx * 80}>
                    <div className="border-t-[3px] border-t-border bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 opacity-55 cursor-default h-full">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <CardIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-base leading-snug">{cardTitle}</p>
                        <p className="text-sm text-muted-foreground mt-1">{cardSubtitle}</p>
                      </div>
                      <div className="mt-auto text-xs tracking-widest uppercase text-muted-foreground font-semibold">
                        {d.home.comingSoon}
                      </div>
                    </div>
                  </AnimateIn>
                )
              }
              return (
                <AnimateIn key={card._id} delay={idx * 80}>
                  <Link
                    href={card.href}
                    className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 card-hover group h-full"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CardIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-base leading-snug">{cardTitle}</p>
                      <p className="text-sm text-muted-foreground mt-1">{cardSubtitle}</p>
                    </div>
                    <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                      {cardCta} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </AnimateIn>
              )
            })}
          </div>
        </section>
      )}

      {/* ── STATS ── */}
      {sections.stats !== false && stats.length > 0 && (
        <section>
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-xl md:text-2xl font-bold text-center text-foreground mb-8">
              {statsHeading}
            </h2>
            <div className={`grid ${statsGrid(stats.length)} gap-6`}>
              {stats.map((s, idx) => {
                const metric = resolveMetric(s.metric, s.label)
                const display = metric ? publicStats[metric].toLocaleString("ka-GE") : s.value
                const seedStat = seedStatById.get(s._id)
                const statLabel = pick(s.label, s.labelEn || seedStat?.labelEn, locale)
                return (
                  <AnimateIn key={s._id} delay={idx * 100}>
                    <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center gap-3 card-hover h-full">
                      <p className="text-6xl font-bold text-primary leading-none tabular-nums">{display}</p>
                      <div className="w-8 h-px bg-border" />
                      <p className="text-sm text-muted-foreground leading-snug max-w-[140px]">{statLabel}</p>
                    </div>
                  </AnimateIn>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURES / WHY ── */}
      {sections.features !== false && features.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            {featuresHeading}
          </h2>
          <div className={`grid ${featuresGrid(features.length)} gap-6`}>
            {features.map((f, idx) => {
              const FIcon = resolveIcon(f.icon)
              const seedFeature = seedFeatureById.get(f._id)
              const featureTitle = pick(f.title, f.titleEn || seedFeature?.titleEn, locale)
              const featureBody  = pick(f.body,  f.bodyEn  || seedFeature?.bodyEn,  locale)
              return (
                <AnimateIn key={f._id} delay={idx * 60}>
                  <div className="bg-muted/40 rounded-2xl p-5 flex flex-col gap-3 card-hover h-full">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FIcon className="h-4 w-4 text-primary" />
                      </div>
                      <p className="font-bold text-foreground text-sm leading-snug">{featureTitle}</p>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{featureBody}</p>
                  </div>
                </AnimateIn>
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
        <section className="border-t border-border">
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-10 text-center shadow-sm">
              <h2 className="text-3xl font-bold text-foreground">{ctaTitle}</h2>
              <p className="mt-3 text-muted-foreground">{ctaSubtitle}</p>
              <Link
                href={ctaButtonHref}
                className="mt-8 inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 btn-hover"
              >
                {ctaButtonText}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
