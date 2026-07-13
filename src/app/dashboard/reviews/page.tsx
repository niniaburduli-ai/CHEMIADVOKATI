import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { DocumentReview } from "@/lib/models/document-review";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewModalTriggerLink } from "@/components/site/review-modal-trigger-link";
import { SubPageHeader } from "@/components/site/SubPageHeader";
import { ReviewsGrid, type ReviewItem } from "./reviews-grid";
import { computeWordDiff } from "@/lib/diff-text";
import type { RiskFinding } from "@/lib/legal/document-analysis";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/reviews");

  await dbConnect();
  const reviews = await DocumentReview.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const items: ReviewItem[] = reviews.map((review) => {
    const r = review as unknown as {
      _id: unknown;
      fileName?: string;
      createdAt?: Date;
      summary: string;
      findings: unknown[];
      recommendations: unknown[];
      sourceText?: string;
      revisions?: Array<{
        text: string;
        summary: string;
        findings: unknown[];
        recommendations: unknown[];
        instruction: string;
        createdAt?: Date;
      }>;
    };
    const revisions = r.revisions ?? [];
    return {
      id: String(r._id),
      fileName: r.fileName ?? "document",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      summary: r.summary,
      findings: r.findings ?? [],
      recommendations: r.recommendations ?? [],
      revisions: revisions.map((rev, i) => {
        const baseText = i === 0 ? r.sourceText ?? "" : revisions[i - 1].text;
        return {
          text: rev.text,
          summary: rev.summary,
          findings: rev.findings as unknown as RiskFinding[],
          recommendations: rev.recommendations as string[],
          instruction: rev.instruction,
          createdAt: rev.createdAt ? new Date(rev.createdAt).toISOString() : null,
          diff: computeWordDiff(baseText, rev.text),
        };
      }),
    };
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <SubPageHeader
        backHref="/dashboard"
        title="დოკუმენტის მიმოხილვის შედეგები"
        subtitle={`${items.length} ანალიზი`}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">ჯერ დოკუმენტი არ გაქვს გაანალიზებული.</p>
            <ReviewModalTriggerLink
              label="დოკუმენტის ანალიზი"
              locale="ka"
              className={buttonVariants()}
            />
          </CardContent>
        </Card>
      ) : (
        <ReviewsGrid items={items} />
      )}
    </div>
  );
}
