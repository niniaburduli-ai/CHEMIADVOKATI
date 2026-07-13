"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, FileSearch, AlertCircle, CheckCircle2, ChevronDown, Wand2, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiskFindingCard, isStructuredFinding } from "@/components/site/risk-finding-card";
import { TextDiff } from "@/components/site/text-diff";
import { DocumentDownloadButton } from "@/components/site/document-download-button";
import { formatDate } from "@/lib/utils";
import type { RiskFinding } from "@/lib/legal/document-analysis";
import type { DiffSegment } from "@/lib/diff-text";

export type ReviewRevisionItem = {
  text: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
  instruction: string;
  createdAt: string | null;
  diff: DiffSegment[];
};

export type ReviewItem = {
  id: string;
  fileName: string;
  createdAt: string | null;
  summary: string;
  findings: unknown[];
  recommendations: unknown[];
  revisions: ReviewRevisionItem[];
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

export function ReviewsGrid({ items }: { items: ReviewItem[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {items.map((review) => {
        const isOpen = expandedId === review.id;
        const findings = review.findings ?? [];
        const recommendations = review.recommendations ?? [];
        return (
          <Card key={review.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSearch className="h-4 w-4 shrink-0" />
                    {review.fileName ?? "document"}
                  </CardTitle>
                  {review.createdAt && (
                    <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatDate(review.createdAt)}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/services?tab=docs&reviewId=${review.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-2 py-1.5"
                  >
                    <Play className="h-3 w-3" /> განაგრძეთ
                  </Link>
                  {review.revisions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isOpen ? null : review.id)}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">შეჯამება</p>
                <p className="text-sm leading-relaxed">{review.summary}</p>
              </div>

              {findings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> ნაპოვნი რისკები
                  </p>
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
                </div>
              )}

              {recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> რეკომენდაციები
                  </p>
                  <RecommendationList recommendations={recommendations} />
                </div>
              )}

              {isOpen && review.revisions.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Wand2 className="h-3 w-3" /> შესწორების ისტორია
                  </p>
                  {review.revisions.map((rev, i) => (
                    <div key={i} className="space-y-3 rounded-lg border border-border p-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          მოთხოვნა #{i + 1}
                        </p>
                        <p className="text-sm">
                          {rev.instruction.trim() || "შეასწორე ყველა გამოვლენილი რისკი."}
                        </p>
                        {rev.createdAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" /> {formatDate(rev.createdAt)}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-muted-foreground">
                            შესწორებული ვერსია
                          </p>
                          <DocumentDownloadButton
                            content={rev.text}
                            filename={`${review.fileName || "document"}-corrected-${i + 1}`}
                          />
                        </div>
                        <TextDiff segments={rev.diff} />
                      </div>

                      {rev.findings.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            განახლებული რისკები
                          </p>
                          <div className="space-y-2">
                            {rev.findings.map((f, fi) => (
                              <RiskFindingCard key={fi} finding={f} locale="ka" />
                            ))}
                          </div>
                        </div>
                      )}

                      {rev.recommendations.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            განახლებული რეკომენდაციები
                          </p>
                          <RecommendationList recommendations={rev.recommendations} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
