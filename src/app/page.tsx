import Link from "next/link"
import { AnimateIn } from "@/components/site/AnimateIn"
import { PricingSection } from "@/components/site/PricingSection"
import { ServiceCards } from "@/components/site/service-cards"
import { getHomePage } from "@/lib/cms"
import { getVisiblePlans } from "@/lib/plans-db"
import { getFeatureFlags, isPathEnabled } from "@/lib/features"
import { getPublicStats, resolveMetric } from "@/lib/stats"
import { getLocale } from "@/lib/i18n/locale"
import { pick } from "@/lib/i18n/loc"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { getDict } from "@/lib/i18n/dictionaries"
import { resolveIcon } from "@/lib/icon-map"

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
        <section className="relative overflow-hidden bg-slate-900">
          {/* Statue is static; the scale mechanism is a separate overlay layer so only it can swing */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-[62%] flex items-end justify-center pointer-events-none select-none">
            <div className="relative h-full" style={{ aspectRatio: "900 / 1371" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kartlis_deda_5.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kartlis_deda_scale.png"
                alt=""
                aria-hidden="true"
                className="absolute animate-scale-sway object-contain"
                style={{ left: "52.78%", top: "20.57%", width: "46.67%", height: "20.42%" }}
              />
            </div>
          </div>

          <div className="relative container mx-auto px-4">
            <div className="flex flex-col justify-center min-h-[560px] py-12 lg:py-16 max-w-[620px]">
              <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight mb-5 animate-fade-up">
                {heroTitle}
              </h1>
              <p className="text-2xl font-semibold text-gold leading-snug animate-fade-up delay-150">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE CARDS ── */}
      {sections.hero !== false && (
        <ServiceCards
          cards={allServiceCards}
          visibleHrefs={visibleHrefs}
          seedCardById={seedCardById}
          cardsHeading={cardsHeading}
          locale={locale}
          d={d}
        />
      )}

      {/* ── FEATURES / WHY ── */}
      {sections.features !== false && features.length > 0 && (
        <section className="container mx-auto px-4 py-16">
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
                  <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 card-hover h-full">
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

      {/* ── STATS ── */}
      {sections.stats !== false && stats.length > 0 && (
        <section>
          <div className="container mx-auto px-4 py-16">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
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
        <section>
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-2xl mx-auto border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-10 text-center shadow-sm card-hover">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{ctaTitle}</h2>
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
