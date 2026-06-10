import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, FileText, CreditCard, Clock, Search, FileCheck } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Consultation } from "@/lib/models/consultation";
import { Subscription } from "@/lib/models/subscription";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PLAN_LIMITS, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

function UsageRow({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          გამოყენებული: <span className="font-semibold text-foreground">{used} / {total}</span>
          {" · "}დარჩენილი: <span className="font-semibold text-foreground">{remaining}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  await dbConnect();
  const [user, sub] = await Promise.all([
    User.findById(session.user.id).select("-passwordHash").lean(),
    Subscription.findOne({ userId: session.user.id }).lean(),
  ]);
  if (!user) redirect("/login");

  const history = await Consultation.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const plan = (user.plan ?? "free") as Plan;
  const limits = PLAN_LIMITS[plan];

  const consultUsed = Math.max(0, limits.consultations - (user.consultationsRemaining ?? 0));
  const docGenUsed = Math.max(0, limits.docGeneration - (user.docGenerationRemaining ?? 0));
  const reviewUsed = Math.max(0, limits.docReview - (user.docReviewRemaining ?? 0));

  const subStatus = sub?.status ?? null;
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd as unknown as Date).toLocaleDateString("ka-GE")
    : null;

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">გამარჯობა, {user.name}</h1>
          <p className="text-muted-foreground mt-1">შენი იურიდიული ცენტრი</p>
        </div>
        <Link href="/chat" className={buttonVariants()}>
          <MessagesSquare className="mr-2 h-4 w-4" /> ახალი კონსულტაცია
        </Link>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/chat" className="block">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardDescription>კონსულტაცია</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessagesSquare className="h-4 w-4" /> AI იურისტი
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                დარჩენილი: {user.consultationsRemaining ?? 0}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/generate" className="block">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardDescription>დოკუმენტი</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" /> გენერაცია
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                დარჩენილი: {user.docGenerationRemaining ?? 0}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/review" className="block">
          <Card className="hover:border-primary/50 transition-colors h-full">
            <CardHeader className="pb-2">
              <CardDescription>მიმოხილვა</CardDescription>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4" /> ანალიზი
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                დარჩენილი: {user.docReviewRemaining ?? 0}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* My Plan & Usage */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>ჩემი გეგმა და გამოყენება</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="capitalize font-medium">
                  {plan === "standard" ? "სტანდარტი — $5/თვე" : "უფასო"}
                </span>
                {subStatus && (
                  <Badge variant={subStatus === "active" ? "default" : "secondary"}>
                    {subStatus}
                  </Badge>
                )}
                {periodEnd && (
                  <span className="text-xs">მოქმედია {periodEnd}-მდე</span>
                )}
              </CardDescription>
            </div>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <CreditCard className="mr-2 h-4 w-4" /> მართვა
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <UsageRow label="კონსულტაციები" used={consultUsed} total={limits.consultations} />
          <UsageRow label="დოკუმენტის გენერაცია" used={docGenUsed} total={limits.docGeneration} />
          <UsageRow label="დოკუმენტის მიმოხილვა" used={reviewUsed} total={limits.docReview} />
          {plan === "free" && (
            <p className="text-xs text-muted-foreground mt-3">
              მეტი ლიმიტისთვის{" "}
              <Link href="/pricing" className="underline text-primary">
                გადადი სტანდარტ გეგმაზე
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      {/* History links */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/dashboard/consultations">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessagesSquare className="h-4 w-4" /> კონსულტაციების ისტორია
              </CardTitle>
              <CardDescription>ყველა შეკითხვა და პასუხი</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/documents">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> გენერირებული დოკუმენტები
              </CardTitle>
              <CardDescription>ჩამოტვირთვა და ნახვა</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/reviews">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> მიმოხილვის შედეგები
              </CardTitle>
              <CardDescription>ანალიზის ისტორია</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent consultations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>ბოლო კონსულტაციები</CardTitle>
            <CardDescription>უახლესი 5 შეკითხვა</CardDescription>
          </div>
          <Link
            href="/dashboard/consultations"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ყველა →
          </Link>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              ჯერ კონსულტაცია არ გაქვს.{" "}
              <Link href="/chat" className="underline">
                დაიწყე აქ
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => {
                const id = String((h as { _id: unknown })._id);
                const created = (h as { createdAt?: Date }).createdAt;
                return (
                  <div key={id}>
                    <Link
                      href={`/dashboard/consultations#${id}`}
                      className="flex items-start justify-between gap-4 py-2 hover:bg-muted/40 -mx-2 px-2 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{h.question}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {created ? new Date(created).toLocaleDateString("ka-GE") : ""}
                      </div>
                    </Link>
                    {i < history.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
