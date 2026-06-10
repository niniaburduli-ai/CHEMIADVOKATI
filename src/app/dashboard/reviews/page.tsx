import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, FileSearch, AlertCircle, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { DocumentReview } from "@/lib/models/document-review";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/reviews");

  await dbConnect();
  const reviews = await DocumentReview.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">დოკუმენტის მიმოხილვის შედეგები</h1>
          <p className="text-sm text-muted-foreground">{reviews.length} ანალიზი</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">ჯერ დოკუმენტი არ გაქვს გაანალიზებული.</p>
            <Link href="/review" className={buttonVariants()}>
              დოკუმენტის ანალიზი
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const id = String((review as { _id: unknown })._id);
            const created = (review as { createdAt?: Date }).createdAt;
            const findings = review.findings ?? [];
            const recommendations = review.recommendations ?? [];
            return (
              <Card key={id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileSearch className="h-4 w-4 shrink-0" />
                        {review.fileName ?? "document"}
                      </CardTitle>
                      {created && (
                        <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {new Date(created).toLocaleDateString("ka-GE")}
                        </CardDescription>
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
                        <AlertCircle className="h-3 w-3" /> ნაპოვნი პრობლემები
                      </p>
                      <ul className="space-y-1">
                        {findings.map((f, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> რეკომენდაციები
                      </p>
                      <ul className="space-y-1">
                        {recommendations.map((r, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
