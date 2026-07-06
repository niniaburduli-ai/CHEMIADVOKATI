import Link from "next/link";
import { ArrowRight, MessageCircle, FileText, FolderSearch } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { FeatureFlagsData } from "@/lib/features";

export function ServiceCards({
  cardsHeading,
  d,
  flags,
}: {
  cardsHeading: string;
  d: Dict;
  flags: FeatureFlagsData;
}) {
  const items = [
    { key: "chat", icon: MessageCircle, label: d.servicesModal.aiTab, desc: d.servicesModal.aiSubtitle, enabled: flags.chat },
    { key: "review", icon: FolderSearch, label: d.documentAnalysis.title, desc: d.documentAnalysis.subtitle, enabled: flags.review },
    { key: "generate", icon: FileText, label: d.servicesModal.templatesTab, desc: d.servicesModal.templatesHint, enabled: flags.generate },
  ].filter((i) => i.enabled);

  if (items.length === 0) return null;

  const gridCols =
    items.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : items.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" : "sm:grid-cols-3";

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{cardsHeading}</h2>
        <div className="h-1 w-24 bg-primary mx-auto mt-4 rounded-full" />
      </div>
      <div className={`grid ${gridCols} gap-6`}>
        {items.map((i, idx) => {
          const Icon = i.icon;
          return (
            <AnimateIn key={i.key} delay={idx * 80}>
              <div className="bg-card border border-border rounded-2xl p-7 flex flex-col h-full gap-4 card-hover">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-bold text-lg text-foreground">{i.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{i.desc}</p>
              </div>
            </AnimateIn>
          );
        })}
      </div>
      <div className="flex justify-center mt-10">
        <Link
          href="/services"
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-8 py-3.5 rounded-xl btn-hover"
        >
          {d.home.learnMore}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
