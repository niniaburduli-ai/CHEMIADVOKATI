"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import { DocumentAnalysisModal } from "@/components/site/document-analysis-modal";
import { resolveIcon } from "@/lib/icon-map";
import { pick } from "@/lib/i18n/loc";
import type { Locale } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

type ServiceCard = {
  _id: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  ctaText?: string;
  ctaTextEn?: string;
};

export function ServiceCards({
  cards,
  visibleHrefs,
  seedCardById,
  cardsHeading,
  locale,
  d,
}: {
  cards: ServiceCard[];
  visibleHrefs: Set<string>;
  seedCardById: Map<string, ServiceCard>;
  cardsHeading: string;
  locale: Locale;
  d: Dict;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
        {cardsHeading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card, idx) => {
          if (!visibleHrefs.has(card.href)) {
            return <div key={card._id} className="invisible" aria-hidden="true" />;
          }
          const CardIcon = resolveIcon(card.icon);
          const seedCard = seedCardById.get(card._id);
          const cardTitle = pick(card.title, card.titleEn || seedCard?.titleEn, locale);
          const cardSubtitle = pick(card.subtitle, card.subtitleEn || seedCard?.subtitleEn, locale);
          const cardCta =
            pick(card.ctaText || seedCard?.ctaText || "", card.ctaTextEn || seedCard?.ctaTextEn, locale) ||
            d.home.learnMore;

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
            );
          }

          const cardClasses =
            "border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-6 flex flex-col gap-4 card-hover group h-full";
          const cardInner = (
            <>
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
            </>
          );

          if (card.href === "/review") {
            return (
              <AnimateIn key={card._id} delay={idx * 80}>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className={`${cardClasses} text-left w-full`}
                >
                  {cardInner}
                </button>
              </AnimateIn>
            );
          }

          return (
            <AnimateIn key={card._id} delay={idx * 80}>
              <Link href={card.href} className={cardClasses}>
                {cardInner}
              </Link>
            </AnimateIn>
          );
        })}
      </div>

      <DocumentAnalysisModal open={modalOpen} onOpenChange={setModalOpen} locale={locale} />
    </section>
  );
}
