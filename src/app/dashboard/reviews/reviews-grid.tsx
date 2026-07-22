"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FileSearch,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Wand2,
  Paperclip,
  Play,
} from "lucide-react";
import { RiskFindingCard, isStructuredFinding } from "@/components/site/risk-finding-card";
import { TextDiff } from "@/components/site/text-diff";
import { DocumentDownloadButton } from "@/components/site/document-download-button";
import { formatDate } from "@/lib/utils";
import type { RiskFinding } from "@/lib/legal/document-analysis";
import type { DiffSegment } from "@/lib/diff-text";
import type { Dict } from "@/lib/i18n/dictionaries";

export type ReviewRevisionItem = {
  text: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
  instruction: string;
  createdAt: string | null;
  diff: DiffSegment[];
  baseText: string;
};

export type ReviewItem = {
  id: string;
  fileName: string;
  createdAt: string | null;
  summary: string;
  findings: unknown[];
  recommendations: unknown[];
  revisions: ReviewRevisionItem[];
  sourceText: string;
};

function RecommendationList({ recommendations }: { recommendations: unknown[] }) {
  return (
    <ul className="space-y-1">
      {recommendations.map((r, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          {typeof r === "string"
            ? r
            : (r as { recommendation?: string; title?: string }).recommendation ??
              (r as { title?: string }).title ??
              JSON.stringify(r)}
        </li>
      ))}
    </ul>
  );
}

function StageItem({
  number,
  title,
  icon,
  meta,
  isOpen,
  onToggle,
  fixed = false,
  isLast = false,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
  fixed?: boolean;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-5 min-w-0">
        {fixed ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {icon}
            {title}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground min-w-0">
              {icon}
              <span className="truncate">{title}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {meta}
              <ChevronDown
                className={`h-4 w-4 text-gold transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        )}
        {(fixed || isOpen) && <div className="mt-3 space-y-3">{children}</div>}
      </div>
    </div>
  );
}

function ReviewDetail({ review }: { review: ReviewItem }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const findings = review.findings ?? [];
  const recommendations = review.recommendations ?? [];
  const revisions = review.revisions ?? [];
  const rounds = revisions.length > 0 ? revisions.length : 1;

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <div>
      <StageItem
        number={1}
        title="დოკუმენტის მიმოხილვა"
        icon={<FileSearch className="h-4 w-4 text-gold" />}
        fixed
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold leading-snug">{review.fileName ?? "document"}</p>
            {review.createdAt && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-gold" /> {formatDate(review.createdAt)}
              </p>
            )}
          </div>
          <Link
            href={`/services?tab=docs&reviewId=${review.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline px-2 py-1.5 shrink-0"
          >
            <Play className="h-3 w-3 text-gold" /> განაგრძეთ
          </Link>
        </div>
        <p className="text-sm leading-relaxed">{review.summary}</p>
      </StageItem>

      <StageItem
        number={2}
        title="გამოვლენილი რისკები და რეკომენდაციები"
        icon={<AlertCircle className="h-4 w-4 text-gold" />}
        meta={
          findings.length > 0 ? (
            <span className="text-xs text-muted-foreground">{findings.length}</span>
          ) : undefined
        }
        isOpen={openKey === "risks"}
        onToggle={() => toggle("risks")}
      >
        {findings.length > 0 ? (
          <div className="space-y-2">
            {findings.map((f, i) =>
              isStructuredFinding(f) ? (
                <RiskFindingCard key={i} finding={f} locale="ka" />
              ) : (
                <div key={i} className="text-sm flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                  {String(f)}
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">რისკები არ არის გამოვლენილი.</p>
        )}

        {recommendations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-gold" /> რეკომენდაციები
            </p>
            <RecommendationList recommendations={recommendations} />
          </div>
        )}
      </StageItem>

      {Array.from({ length: rounds }, (_, i) => {
        const revision = revisions[i];
        const roundLabel = revisions.length > 1 ? ` · რაუნდი ${i + 1}` : "";
        const attachedText = revision ? revision.baseText : review.sourceText;
        const isLastStage = i === rounds - 1;

        return (
          <div key={i}>
            <StageItem
              number={3}
              title={`თანდართული ტექსტი და მოთხოვნა${roundLabel}`}
              icon={<Paperclip className="h-4 w-4 text-gold" />}
              isOpen={openKey === `request-${i}`}
              onToggle={() => toggle(`request-${i}`)}
            >
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  თანდართული დოკუმენტის ტექსტი
                </p>
                <pre className="whitespace-pre-wrap text-xs bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {attachedText || "—"}
                </pre>
              </div>

              {revision ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                    მომხმარებლის მოთხოვნა
                  </p>
                  <p className="text-sm">
                    {revision.instruction.trim() || "შეასწორე ყველა გამოვლენილი რისკი."}
                  </p>
                  {revision.createdAt && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-gold" /> {formatDate(revision.createdAt)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  მოთხოვნა ჯერ არ გაგზავნილა.{" "}
                  <Link
                    href={`/services?tab=docs&reviewId=${review.id}`}
                    className="text-gold underline"
                  >
                    მოითხოვეთ გაუმჯობესებული ვერსია
                  </Link>
                </div>
              )}
            </StageItem>

            <StageItem
              number={4}
              title={`გენერირებული გაუმჯობესებული ვერსია${roundLabel}`}
              icon={<Wand2 className="h-4 w-4 text-gold" />}
              isOpen={openKey === `result-${i}`}
              onToggle={() => toggle(`result-${i}`)}
              isLast={isLastStage}
            >
              {revision ? (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">
                        შესწორებული ვერსია
                      </p>
                      <DocumentDownloadButton
                        content={revision.text}
                        filename={`${review.fileName || "document"}-corrected-${i + 1}`}
                      />
                    </div>
                    <TextDiff segments={revision.diff} />
                  </div>

                  {revision.findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        განახლებული რისკები
                      </p>
                      <div className="space-y-2">
                        {revision.findings.map((f, fi) => (
                          <RiskFindingCard key={fi} finding={f} locale="ka" />
                        ))}
                      </div>
                    </div>
                  )}

                  {revision.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        განახლებული რეკომენდაციები
                      </p>
                      <RecommendationList recommendations={revision.recommendations} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  ვერსია ჯერ არ გენერირებულა.{" "}
                  <Link
                    href={`/services?tab=docs&reviewId=${review.id}`}
                    className="text-gold underline"
                  >
                    დაიწყეთ გენერაცია
                  </Link>
                </div>
              )}
            </StageItem>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewsGrid({ items, d }: { items: ReviewItem[]; d: Dict }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((it) => it.id === openId) ?? null;
  const dp = d.profile;

  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-gold" />
          {dp.analysisResults}
        </h3>
      </header>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12 px-5">
            {dp.noReviews}{" "}
            <Link href="/services?tab=docs" className="underline text-gold">
              {dp.uploadDoc}
            </Link>
          </p>
        ) : active ? (
          <div className="p-5">
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-gold" /> {d.faq.back}
            </button>
            <ReviewDetail review={active} />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((review) => (
              <button
                key={review.id}
                type="button"
                onClick={() => setOpenId(review.id)}
                className="w-full text-left px-5 py-3 hover:bg-muted transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileSearch className="h-4 w-4 shrink-0 text-gold" />
                  <p className="text-sm font-medium truncate">{review.fileName ?? "document"}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-gold" /> {formatDate(review.createdAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
