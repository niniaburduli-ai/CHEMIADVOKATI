"use client";

import Link from "next/link";
import { MessageCircle, FileText, FolderSearch, LayoutTemplate } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { FeatureFlagsData } from "@/lib/features";

const CARD_CLASSES =
  "group flex gap-3.5 items-start bg-card border border-border rounded-2xl p-3 text-left transition-colors hover:bg-primary/10 hover:border-primary/50 w-full";

export function ServiceCards({
  cardsHeading,
  d,
  flags,
}: {
  cardsHeading: string;
  d: Dict;
  flags: FeatureFlagsData;
}) {
  // Every card opens the /services hub on its matching tab, so the card preview
  // (icon + title + subtitle) always matches what the tab shows.
  const items = [
    { key: "chat", href: "/services?tab=ai", icon: MessageCircle, label: d.servicesModal.aiTab, desc: d.servicesModal.aiSubtitle, enabled: flags.chat },
    { key: "review", href: "/services?tab=docs", icon: FolderSearch, label: d.documentAnalysis.title, desc: d.documentAnalysis.subtitle, enabled: flags.review },
    { key: "templates", href: "/services?tab=templatesFill", icon: LayoutTemplate, label: d.servicesModal.templatesTab, desc: d.servicesModal.templatesHint, enabled: flags.templates },
    { key: "generate", href: "/services?tab=templates", icon: FileText, label: d.servicesModal.customDocsTab, desc: d.servicesModal.customDocsHint, enabled: flags.generate },
  ].filter((i) => i.enabled);

  if (items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{cardsHeading}</h2>
        <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-gold mx-auto mt-4 rounded-full" />
      </div>

      {/* Signpost rail — every card mounts to the same central axis via a short arm, like street signs on a pole */}
      <div className="relative max-w-3xl mx-auto">
        <div className="absolute top-0 bottom-0 w-[3px] left-[13px] sm:left-1/2 sm:-translate-x-1/2 rounded-full bg-gradient-to-b from-primary to-gold" />

        <div className="flex flex-col gap-1.5">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const onRight = idx % 2 === 1;
            const content = (
              <>
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center transition-all group-hover:ring-primary/30 group-hover:scale-105">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground mb-0.5">{item.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </>
            );

            return (
              <div key={item.key} className="relative flex items-center pl-9 sm:pl-0">
                <div className="absolute top-1/2 -translate-y-1/2 left-[13px] sm:left-1/2 sm:-translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary border-[3px] border-background ring-2 ring-border z-10" />

                <div
                  className={`hidden sm:block absolute top-1/2 -translate-y-1/2 h-[2px] w-8 bg-border ${onRight ? "left-1/2" : "right-1/2"}`}
                />

                <AnimateIn
                  delay={idx * 100}
                  className={`w-full sm:w-[calc(50%-2rem)] ${onRight ? "sm:ml-auto" : "sm:mr-auto"}`}
                >
                  <Link href={item.href} className={CARD_CLASSES}>
                    {content}
                  </Link>
                </AnimateIn>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
