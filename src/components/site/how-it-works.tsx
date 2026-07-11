"use client";

import { useState } from "react";
import { MessageCircle, FolderSearch, LayoutTemplate, FileText } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import type { FeatureFlagsData } from "@/lib/features";

type ServiceKey = "chat" | "review" | "templates" | "generate";

type HowItWorksItem = {
  key: ServiceKey;
  title: string;
  steps: string[];
  ctaText: string;
};

const SERVICE_META: Record<ServiceKey, { icon: typeof MessageCircle }> = {
  chat: { icon: MessageCircle },
  review: { icon: FolderSearch },
  templates: { icon: LayoutTemplate },
  generate: { icon: FileText },
};

export function HowItWorks({
  heading,
  items,
  flags,
}: {
  heading: string;
  items: HowItWorksItem[];
  flags: FeatureFlagsData;
}) {
  const visibleItems = items.filter((i) => flags[i.key]);
  const [activeKey, setActiveKey] = useState<ServiceKey | null>(visibleItems[0]?.key ?? null);

  if (visibleItems.length === 0) return null;

  const active = visibleItems.find((i) => i.key === activeKey) ?? visibleItems[0];
  const meta = SERVICE_META[active.key];
  const Icon = meta.icon;

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{heading}</h2>
        <div className="h-1.5 w-16 bg-gradient-to-r from-primary to-gold mx-auto mt-4 rounded-full" />
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveKey(item.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                item.key === active.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>

        <AnimateIn key={active.key} className="bg-card border border-border rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{active.title}</h3>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            {active.steps.map((step, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
