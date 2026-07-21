"use client";

import { useState } from "react";
import { History, Clock, MessageSquare, BookOpen } from "lucide-react";
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
import {
  groupItemsByArticle,
  splitRawSources,
  type RawSource,
  type LegalBasisGroup,
  type RawWebSource,
} from "@/lib/legal/citations";

type ConsultationItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
  legalBasis: LegalBasisGroup[];
  webSources: RawWebSource[];
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
      const raw = data.items as {
        id: string;
        question: string;
        answer: string;
        createdAt: string | null;
        sources?: RawSource[];
      }[];
      setItems(
        raw.map((item) => {
          const { legalBasis, webSources } = splitRawSources(item.sources ?? []);
          return { ...item, legalBasis, webSources };
        })
      );
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
        <History className="h-4 w-4 mr-1.5 text-gold" />
        {t.viewCorrespondence}
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="!w-full sm:!max-w-md p-0 flex flex-col bg-background">
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
                          <Clock className="h-3 w-3 text-gold" /> {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border pt-2">
                        {renderMarkdownBold(item.answer)}
                        {item.legalBasis.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-border/60 pt-2">
                            <p className="text-xs font-semibold text-muted-foreground">{t.legalBasis}</p>
                            {item.legalBasis.map((g) => {
                              const articleGroups = groupItemsByArticle(g.items);
                              return (
                                <div key={`${g.url}|${g.lawName}`} className="space-y-1">
                                  <p className="text-xs font-medium">{g.lawName}:</p>
                                  <ul className="ml-1 space-y-0.5">
                                    {articleGroups.map(({ article, points }) => (
                                      <li key={article} className="text-xs text-muted-foreground">
                                        {article}
                                        {points.length > 1 && (
                                          <>, {t.articlePoints} {points.join("; ")}</>
                                        )}
                                        {points.length === 1 && (
                                          <>, {t.articlePoint} {points[0]}</>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                  {g.url && (
                                    <a
                                      href={g.url}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      className="flex items-start gap-1.5 text-xs text-gold hover:underline"
                                    >
                                      <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" />
                                      <span>{t.source}</span>
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {item.webSources.length > 0 && (
                          <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                            <p className="text-xs font-semibold text-muted-foreground">{t.webSources}</p>
                            <ul className="space-y-0.5">
                              {item.webSources.map((s) => (
                                <li key={s.url}>
                                  <a
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-xs text-gold hover:underline break-all"
                                  >
                                    {s.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
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
