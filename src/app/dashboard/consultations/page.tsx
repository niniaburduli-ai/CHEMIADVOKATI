import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/consultations");

  await dbConnect();
  const items = await Consultation.find({ userId: session.user.id })
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
          <h1 className="text-2xl font-bold">კონსულტაციების ისტორია</h1>
          <p className="text-sm text-muted-foreground">{items.length} კონსულტაცია</p>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">ჯერ კონსულტაცია არ გაქვს.</p>
            <Link href="/chat" className={buttonVariants()}>
              დაიწყე კონსულტაცია
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const id = String((item as { _id: unknown })._id);
            const created = (item as { createdAt?: Date }).createdAt;
            const sources = item.sources ?? [];
            return (
              <Card key={id} id={id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {item.question}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 pt-0.5">
                      <Clock className="h-3 w-3" />
                      {created ? new Date(created).toLocaleDateString("ka-GE") : ""}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {item.answer}
                  </p>
                  {sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        იურიდიული საფუძველი:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {sources.slice(0, 5).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {s.title}
                            {s.articleNumber ? ` — ${s.articleNumber}` : ""}
                          </Badge>
                        ))}
                        {sources.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{sources.length - 5}
                          </Badge>
                        )}
                      </div>
                      {sources[0]?.url && (
                        <a
                          href={sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <BookOpen className="h-3 w-3" /> წყარო
                        </a>
                      )}
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
