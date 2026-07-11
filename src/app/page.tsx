import Link from "next/link"
import { ArrowRight, BadgeCheck, Star } from "lucide-react"
import { AnimateIn } from "@/components/site/AnimateIn"
import { PricingSection } from "@/components/site/PricingSection"
import { ServiceCards } from "@/components/site/service-cards"
import { HowItWorks } from "@/components/site/how-it-works"
import { FaqCarousel } from "@/components/site/FaqCarousel"
import { getHomePage, getFAQ } from "@/lib/cms"
import { getVisiblePlans } from "@/lib/plans-db"
import { getFeatureFlags } from "@/lib/features"
import { getPublicStats, resolveMetric } from "@/lib/stats"
import { getFeedbackSummary } from "@/lib/feedback"
import { getLocale } from "@/lib/i18n/locale"
import { pick } from "@/lib/i18n/loc"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { getDict } from "@/lib/i18n/dictionaries"
import { resolveIcon } from "@/lib/icon-map"
import { JsonLd } from "@/components/site/JsonLd"
import { faqJsonLd } from "@/lib/seo"

function statsGrid(n: number) {
  if (n <= 1) return "grid-cols-1"
  if (n === 2) return "grid-cols-2"
  if (n === 3) return "grid-cols-2 md:grid-cols-3"
  return "grid-cols-2 md:grid-cols-4"
}

export const dynamic = "force-dynamic"

export default async function Home() {
  const locale = await getLocale()
  const d = getDict(locale)
  const seed = getHomeSeed()
  const [cmsData, flags, publicStats, faqData, feedbackSummary] = await Promise.all([
    getHomePage(),
    getFeatureFlags(),
    getPublicStats(),
    getFAQ(locale),
    getFeedbackSummary(),
  ])
  const dbPlans = await getVisiblePlans()

  // Seed lookup maps for En fallback when CMS doc predates bilingual fields
  const seedStatById = new Map(seed.stats.map((s) => [s._id, s]))
  const seedFeatureById = new Map(seed.features.map((f) => [f._id, f]))

  const sections = cmsData?.sections ?? seed.sections

  // ── Hero ─────────────────────────────────────────────────────────────────────
  const cmsHero = cmsData?.hero ?? seed.hero
  const heroTitle    = pick(cmsHero.title    || seed.hero.title,    cmsHero.titleEn    || seed.hero.titleEn,    locale)
  const heroSubtitle = pick(cmsHero.subtitle || seed.hero.subtitle, cmsHero.subtitleEn || seed.hero.subtitleEn, locale)

  // ── Stats ─────────────────────────────────────────────────────────────────────
  // "registered users" is dropped in favor of live feedback metrics below.
  const REGISTERED_USERS_LABELS = new Set(["რეგისტრირებული მომხმარებელი", "Registered users"])
  const stats = (cmsData?.stats ?? seed.stats)
    .filter(
      (s) =>
        s.visible !== false &&
        s.metric !== "users" &&
        !REGISTERED_USERS_LABELS.has(s.label) &&
        !(s.labelEn && REGISTERED_USERS_LABELS.has(s.labelEn)),
    )
    .sort((a, b) => a.order - b.order)

  const feedbackCard =
    feedbackSummary.count > 0
      ? {
          percentage: `${feedbackSummary.percentage}%`,
          percentageLabel: d.feedback.positiveFeedbackLabel,
          rating: `${feedbackSummary.avgRating.toLocaleString("ka-GE")}/5.0`,
          ratingLabel: d.feedback.ratingLabel,
        }
      : null

  const cardsHeading = pick(
    cmsData?.cardsHeading   || seed.cardsHeading,
    cmsData?.cardsHeadingEn || seed.cardsHeadingEn,
    locale,
  )

  const howItWorksHeading = pick(
    cmsData?.howItWorksHeading   || seed.howItWorksHeading,
    cmsData?.howItWorksHeadingEn || seed.howItWorksHeadingEn,
    locale,
  )

  const howItWorksItems = (cmsData?.howItWorks?.length ? cmsData.howItWorks : seed.howItWorks).map((item) => ({
    key: item.key,
    title: pick(item.title, item.titleEn, locale),
    steps: item.steps.map((s) => pick(s.text, s.textEn, locale)),
    ctaText: pick(item.ctaText, item.ctaTextEn, locale),
  }))

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

  // ── FAQ heading ───────────────────────────────────────────────────────────────
  const faqHeading = pick(
    cmsData?.faqHeading   || seed.faqHeading,
    cmsData?.faqHeadingEn || seed.faqHeadingEn,
    locale,
  )

  // ── CTA ───────────────────────────────────────────────────────────────────────
  const cmsCta = cmsData?.ctaSection ?? seed.ctaSection
  const ctaButtonText = pick(cmsCta.buttonText || seed.ctaSection.buttonText, cmsCta.buttonTextEn || seed.ctaSection.buttonTextEn, locale)
  const ctaButtonHref = cmsCta.buttonHref || seed.ctaSection.buttonHref

  return (
    <div>
      {/* ── HERO ── */}
      {sections.hero !== false && (
        <section className="relative overflow-hidden bg-slate-900">
          {/* Statue is static; the scale mechanism is a separate overlay layer so only it can swing. */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-[62%] flex items-end justify-center pointer-events-none select-none">
            <div className="relative h-full" style={{ aspectRatio: "900 / 1371" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kartlis_deda_5.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_10px_50px_rgba(0,0,0,0.45)]"
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

          {/* Directional scrim — protects text legibility on the left without dimming the statue where it needs to pop (right/lower) */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/85 to-transparent lg:via-slate-900/35 lg:to-transparent pointer-events-none" />

          <div className="relative container mx-auto px-4">
            <div className="flex flex-col justify-center min-h-[420px] lg:min-h-[500px] py-10 lg:py-14 max-w-[640px] gap-4">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-2 rounded-full backdrop-blur-sm w-fit animate-fade-up">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
                </span>
                <BadgeCheck className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold text-gold uppercase tracking-wider">
                  {d.home.heroBadge}
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight animate-fade-up delay-150">
                {heroTitle}
              </h1>
              <p className="text-lg md:text-xl font-semibold text-gold leading-snug animate-fade-up delay-300 max-w-lg [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                {heroSubtitle}
              </p>
              <Link
                href={ctaButtonHref}
                className="group mt-2 inline-flex items-center gap-2 w-fit bg-gold text-slate-900 px-8 py-4 rounded-xl text-sm font-semibold hover:brightness-95 btn-hover animate-fade-up delay-400"
              >
                {ctaButtonText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICE CARDS ── */}
      {sections.hero !== false && (
        <ServiceCards
          cardsHeading={cardsHeading}
          d={d}
          flags={flags}
          locale={locale}
        />
      )}

      {/* ── HOW IT WORKS ── */}
      {sections.howItWorks !== false && (
        <HowItWorks
          heading={howItWorksHeading}
          items={howItWorksItems}
          flags={flags}
        />
      )}

      {/* ── FEATURES + STATS ── */}
      {((sections.features !== false && features.length > 0) ||
        (sections.stats !== false && stats.length > 0)) && (
        <section className="bg-gradient-to-b from-muted/40 via-background to-background">
          <div className="container mx-auto px-4 py-20">
            <div
              className={`grid gap-10 items-start ${
                sections.features !== false &&
                features.length > 0 &&
                sections.stats !== false &&
                (stats.length > 0 || feedbackCard)
                  ? "md:grid-cols-2"
                  : "md:grid-cols-1"
              }`}
            >
              {sections.features !== false && features.length > 0 && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    {featuresHeading}
                  </h2>
                  <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-primary to-gold mt-4 mb-8" />
                  <div className="flex flex-col gap-6">
                    {features.map((f, idx) => {
                      const FIcon = resolveIcon(f.icon)
                      const seedFeature = seedFeatureById.get(f._id)
                      const featureTitle = pick(f.title, f.titleEn || seedFeature?.titleEn, locale)
                      const featureBody  = pick(f.body,  f.bodyEn  || seedFeature?.bodyEn,  locale)
                      return (
                        <AnimateIn key={f._id} delay={idx * 60}>
                          <div className="flex gap-4 group">
                            <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:ring-primary">
                              <FIcon className="h-5 w-5 text-primary transition-colors group-hover:text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground mb-1">{featureTitle}</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{featureBody}</p>
                            </div>
                          </div>
                        </AnimateIn>
                      )
                    })}
                  </div>
                </div>
              )}

              {sections.stats !== false && (stats.length > 0 || feedbackCard) && (
                <div className={sections.features !== false && features.length > 0 ? "" : "max-w-3xl mx-auto w-full"}>
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
                    {statsHeading}
                  </h2>
                  <div className="h-1.5 w-16 rounded-full bg-gradient-to-r from-primary to-gold mx-auto mt-4 mb-8" />
                  <div
                    className={`grid gap-3 mx-auto ${
                      sections.features !== false && features.length > 0
                        ? "grid-cols-1 w-[65%] mx-auto"
                        : statsGrid(stats.length + (feedbackCard ? 1 : 0))
                    }`}
                  >
                    {stats.map((s, idx) => {
                      const metric = resolveMetric(s.metric, s.label)
                      const display = metric ? publicStats[metric].toLocaleString("ka-GE") : s.value
                      const seedStat = seedStatById.get(s._id)
                      const statLabel = pick(s.label, s.labelEn || seedStat?.labelEn, locale)
                      return (
                        <AnimateIn key={s._id} delay={idx * 100} className="h-full">
                          <div className="relative h-full overflow-hidden bg-card border border-border rounded-2xl p-4 pt-5 flex flex-col items-center justify-center text-center space-y-1 card-hover">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-gold" />
                            <p className="text-2xl font-bold text-primary leading-none tabular-nums">{display}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{statLabel}</p>
                          </div>
                        </AnimateIn>
                      )
                    })}
                    {feedbackCard && (
                      <AnimateIn delay={stats.length * 100} className="h-full">
                        <div className="relative h-full overflow-hidden bg-card border border-border rounded-2xl p-4 pt-5 flex flex-col items-center justify-center text-center space-y-1 card-hover">
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-gold" />
                          <Star className="h-4 w-4 mx-auto text-gold fill-gold" />
                          <div className="flex items-center justify-center gap-3">
                            <div>
                              <p className="text-2xl font-bold text-primary leading-none tabular-nums">{feedbackCard.percentage}</p>
                              <p className="text-xs text-muted-foreground leading-snug mt-1">{feedbackCard.percentageLabel}</p>
                            </div>
                            <div className="w-px h-8 bg-border shrink-0" />
                            <div>
                              <p className="text-2xl font-bold text-primary leading-none tabular-nums">{feedbackCard.rating}</p>
                              <p className="text-xs text-muted-foreground leading-snug mt-1">{feedbackCard.ratingLabel}</p>
                            </div>
                          </div>
                        </div>
                      </AnimateIn>
                    )}
                  </div>
                </div>
              )}
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

      {/* ── FAQ ── */}
      {sections.faq !== false && faqData.items.length > 0 && (
        <section className="bg-background overflow-hidden">
          <JsonLd data={faqJsonLd(faqData.items.map((i) => ({ q: i.question, a: i.answer })))} />
          <div className="container mx-auto px-4 py-10">
            <div className="text-center mb-4">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{faqHeading}</h2>
              <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-gold mx-auto mt-4 rounded-full" />
            </div>
            <FaqCarousel items={faqData.items} labels={d.faq} viewAllHref="/faq" />
          </div>
        </section>
      )}

    </div>
  )
}
