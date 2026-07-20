"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type LimitMetric = {
  key: string;
  label: string;
  icon: React.ReactNode;
  used: number;
  remaining: number;
  total: number;
  isUnlimited: boolean;
};

export function LimitsDialog({
  metrics,
  triggerLabel,
  triggerSubtitle,
  title,
  subtitle,
  remainingLabel,
  unlimitedLabel,
}: {
  metrics: LimitMetric[];
  triggerLabel: string;
  triggerSubtitle: string;
  title: string;
  subtitle: string;
  remainingLabel: string;
  unlimitedLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-6 card-hover h-full flex flex-col gap-3 text-left w-full"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-gold" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{triggerLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">{triggerSubtitle}</p>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-background">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.key} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {m.icon}
                    {m.label}
                  </div>
                  <span className="text-xl font-bold tabular-nums text-gold">{m.used}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {m.isUnlimited
                    ? unlimitedLabel
                    : `${remainingLabel}: ${m.remaining} / ${m.total}`}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
