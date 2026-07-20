"use client";

import { useState } from "react";
import { History, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { renderMarkdownBold } from "@/lib/markdown-bold";
import { formatDate } from "@/lib/utils";

type ConsultationItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
};

type LoadState = "idle" | "loading" | "loaded" | "error" | "unauthorized";

export function PreviousCorrespondenceButton({ locale }: { locale: Locale }) {
  const t = getDict(locale).chat;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>("idle");
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setState("loading");
    try {
      const res = await fetch("/api/consultations");
      if (res.status === 401) {
        setState("unauthorized");
        toast.error(t.errorGeneric);
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      setItems(data.items as ConsultationItem[]);
      setState("loaded");
    } catch {
      setState("error");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && state === "idle") load();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
        <History className="h-4 w-4 mr-1.5" />
        {t.viewCorrespondence}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background">
          <SheetHeader className="border-b border-border">
            <SheetTitle>{t.viewCorrespondence}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {state === "loading" && (
              <p className="text-sm text-muted-foreground text-center py-8">{t.writing}</p>
            )}
            {state === "error" && (
              <p className="text-sm text-destructive text-center py-8">{t.errorGeneric}</p>
            )}
            {state === "loaded" && items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t.correspondenceEmpty}
              </p>
            )}
            {state === "loaded" &&
              items.map((item) => {
                const isOpen = expandedId === item.id;
                return (
                  <div key={item.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : item.id)}
                      className="w-full text-left p-3 flex items-start gap-2 hover:bg-muted/50 transition-colors"
                    >
                      <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 text-gold" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2">
                          {item.question}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border pt-2">
                        {renderMarkdownBold(item.answer)}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
