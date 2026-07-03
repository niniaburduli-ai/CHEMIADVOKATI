"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupItemsByArticle, type LegalBasisItem } from "@/lib/legal/citations";
import { renderMarkdownBold } from "@/lib/markdown-bold";

export type RawSource = {
  title?: string;
  url?: string;
  article?: string;
  paragraph?: string;
  subparagraph?: string;
  /** Legacy: consultations saved before article/paragraph/subparagraph existed. */
  articleNumber?: string;
};

export type ConsultationItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
  sources: RawSource[];
};

type SourceGroup = {
  lawName: string;
  url?: string;
  articleGroups: Array<{ article: string; points: string[] }>;
};

/**
 * Same grouping the live chat view uses (groupItemsByArticle), so the history
 * view renders identical "Legal Basis" text for the same underlying data
 * instead of its own re-derivation.
 */
function groupSources(sources: RawSource[]): SourceGroup[] {
  const groups = new Map<string, { lawName: string; url?: string; items: LegalBasisItem[] }>();
  for (const s of sources) {
    const key = `${s.title ?? ""}|${s.url ?? ""}`;
    let g = groups.get(key);
    if (!g) {
      g = { lawName: s.title ?? "", url: s.url, items: [] };
      groups.set(key, g);
    }
    if (s.article) {
      g.items.push({
        article: s.article,
        paragraph: s.paragraph ?? null,
        subparagraph: s.subparagraph ?? null,
      });
    } else {
      g.items.push({ article: s.articleNumber ?? s.title ?? "", paragraph: null, subparagraph: null });
    }
  }
  return [...groups.values()].map((g) => ({
    lawName: g.lawName,
    url: g.url,
    articleGroups: groupItemsByArticle(g.items),
  }));
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ka-GE") : "";
}

export function ConsultationsGrid({ items }: { items: ConsultationItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((it) => it.id === openId) ?? null;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">ჯერ კონსულტაცია არ გაქვს.</p>
          <Link href="/chat" className={buttonVariants()}>
            დაიწყე კონსულტაცია
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            className="text-left border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover h-full flex flex-col gap-3"
          >
            <p className="text-sm font-semibold leading-snug line-clamp-2">{item.question}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
              <Clock className="h-3 w-3" /> {formatDate(item.createdAt)}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(next) => !next && setOpenId(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{active.question}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(active.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {renderMarkdownBold(active.answer)}
              </p>
              {active.sources.length > 0 && (
                <div className="mt-1 space-y-3 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    იურიდიული საფუძველი:
                  </p>
                  {groupSources(active.sources).map((g, i) => (
                    <div key={`${g.url ?? ""}|${i}`} className="space-y-1">
                      <p className="text-xs font-medium">{g.lawName}:</p>
                      <ul className="ml-1 space-y-0.5">
                        {g.articleGroups.map(({ article, points }) => (
                          <li key={article} className="text-xs text-muted-foreground">
                            {article}
                            {points.length > 1 && <>, პუნქტები: {points.join("; ")}</>}
                            {points.length === 1 && <>, პუნქტი: {points[0]}</>}
                          </li>
                        ))}
                      </ul>
                      {g.url && (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                        >
                          <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>წყარო</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
