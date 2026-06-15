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
import { HOME_SEED } from "@/lib/homepage-defaults"

const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare, FileText, FolderOpen, ArrowRight,
  Layers, Users, MousePointerClick, Zap, ShieldCheck, Clock, Circle,
}

function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Circle
}

export default async function Home() {
  const cms = await getHomePage()

  const sections  = cms?.sections  ?? HOME_SEED.sections
  const hero      = cms?.hero      ?? HOME_SEED.hero
  const ctaSection = cms?.ctaSection ?? HOME_SEED.ctaSection

  const serviceCards = ((cms?.serviceCards ?? HOME_SEED.serviceCards) as typeof HOME_SEED.serviceCards)
    .filter((c) => c.visible !== false)
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
  const plans = ((cms?.plans ?? HOME_SEED.plans) as typeof HOME_SEED.plans)
    .filter((p) => p.visible !== false)
    .sort((a, b) => a.order - b.order)

  return (
    <div>
      {/* ── HERO ── */}
      {sections.hero !== false && (
        <section className="relative overflow-hidden bg-gradient-to-br from-[#ededff] via-[#eef0ff] to-[#e8eaff]">
          <div className="container mx-auto px-4 py-14 md:py-20">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold text-[#1a1a2e] leading-none mb-3 tracking-tight">
                {hero.title || HOME_SEED.hero.title}
              </h1>
              <p className="text-3xl md:text-4xl text-[#4338ca] mb-10 font-semibold">
                {hero.subtitle || HOME_SEED.hero.subtitle}
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-xl">
                {serviceCards.map((card) => {
                  const CardIcon = resolveIcon(card.icon)
                  if (card.comingSoon) {
                    return (
                      <div
                        key={card._id}
                        className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-1 cursor-default"
                      >
                        <span className="text-[10px] text-gray-400 font-medium tracking-wide mb-0.5 uppercase">
                          მალე დაემატება
                        </span>
                        <CardIcon className="h-7 w-7 text-[#a5b4fc] mb-1" />
                        <span className="font-bold text-[#6b7280] text-base leading-snug">{card.title}</span>
                        <span className="text-sm text-gray-400 leading-snug">{card.subtitle}</span>
                        <ArrowRight className="h-5 w-5 text-gray-300 mt-2" />
                      </div>
                    )
                  }
                  return (
                    <Link
                      key={card._id}
                      href={card.href}
                      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-1 group"
                    >
                      <CardIcon className="h-7 w-7 text-[#6366f1] mb-1" />
                      <span className="font-bold text-[#1a1a2e] text-base leading-snug">{card.title}</span>
                      <span className="text-sm text-gray-500 leading-snug">{card.subtitle}</span>
                      <ArrowRight className="h-5 w-5 text-[#6366f1] mt-2 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )
                })}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => {
              const StatIcon = resolveIcon(s.icon)
              return (
                <div
                  key={s._id}
                  className="bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-6 py-7 flex items-center gap-4"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                    <StatIcon className="h-6 w-6 text-[#6366f1]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-[#3730a3] leading-none">{s.value}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {features.map((f, idx) => {
              const FIcon = resolveIcon(f.icon)
              return (
                <div key={f._id} className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-[#ededff] flex items-center justify-center shrink-0">
                    <FIcon className="h-7 w-7 text-[#6366f1]" />
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
          <div className="grid gap-6 md:grid-cols-3 items-start">
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
                    plan={p.plan as "standard" | "premium"}
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
