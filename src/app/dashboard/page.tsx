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
import { getPlanByKey } from "@/lib/plans-db";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { AnimateIn } from "@/components/site/AnimateIn";

export const dynamic = "force-dynamic";

function UsageRow({
  label,
  usedLabel,
  leftLabel,
  used,
  total,
}: {
  label: string;
  usedLabel: string;
  leftLabel: string;
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
          {usedLabel} <span className="font-semibold text-foreground">{used} / {total}</span>
          {" · "}
          {leftLabel} <span className="font-semibold text-foreground">{remaining}</span>
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
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const d = getDict(locale);

  await dbConnect();
  const [user, sub, flags] = await Promise.all([
    User.findById(session.user.id).select("-passwordHash").lean(),
    Subscription.findOne({ userId: session.user.id }).lean(),
    getFeatureFlags(),
  ]);
  if (!user) redirect("/login");

  const plan = user.plan ?? "free";
  const [history, planData] = await Promise.all([
    Consultation.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    getPlanByKey(plan),
  ]);

  const consultLimit = planData?.consultations ?? 9;
  const showGenerate = flags.generate && planData ? planData.includeDocGeneration : false;
  const showReview = flags.review && planData ? planData.includeDocReview : false;
  const genLimit = showGenerate ? (planData?.docGeneration ?? 0) : 0;
  const reviewLimit = showReview ? (planData?.docReview ?? 0) : 0;

  const consultUsed = Math.max(0, consultLimit - (user.consultationsRemaining ?? 0));
  const docGenUsed = showGenerate ? Math.max(0, genLimit - (user.docGenerationRemaining ?? 0)) : 0;
  const reviewUsed = showReview ? Math.max(0, reviewLimit - (user.docReviewRemaining ?? 0)) : 0;

  const subStatus = sub?.status ?? null;
  const dateLocale = locale === "en" ? "en-GB" : "ka-GE";
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd as unknown as Date).toLocaleDateString(dateLocale)
    : null;

  const planLabel = plan === "standard" ? d.dashboard.standard : d.dashboard.free;

  return (
    <div>
      <section className="bg-slate-900">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-white animate-fade-up leading-tight">
                {d.dashboard.greeting} {user.name}
              </h1>
              <p className="text-2xl font-semibold text-gold mt-3 animate-fade-up delay-150 leading-snug">
                {d.dashboard.subtitle}
              </p>
            </div>
            <Link href="/chat" className={buttonVariants() + " btn-hover"}>
              <MessagesSquare className="mr-2 h-4 w-4" /> {d.dashboard.newConsultation}
            </Link>
          </div>
        </div>
      </section>
      <div className="container mx-auto px-4 py-16 max-w-5xl">

      {/* Quick actions */}
      <AnimateIn delay={0}>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/chat" className="block">
          <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover h-full flex flex-col gap-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{d.dashboard.consultation}</p>
            <p className="text-lg font-bold flex items-center gap-2 text-foreground">
              <MessagesSquare className="h-4 w-4 text-primary" /> {d.dashboard.aiLawyer}
            </p>
            <p className="text-sm text-muted-foreground mt-auto">
              {d.dashboard.remaining} <span className="font-semibold text-foreground">{user.consultationsRemaining ?? 0}</span>
            </p>
          </div>
        </Link>
        {showGenerate && (
          <Link href="/generate" className="block">
            <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover h-full flex flex-col gap-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{d.dashboard.document}</p>
              <p className="text-lg font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-4 w-4 text-primary" /> {d.dashboard.generation}
              </p>
              <p className="text-sm text-muted-foreground mt-auto">
                {d.dashboard.remaining} <span className="font-semibold text-foreground">{user.docGenerationRemaining ?? 0}</span>
              </p>
            </div>
          </Link>
        )}
        {showReview && (
          <Link href="/review" className="block">
            <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover h-full flex flex-col gap-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{d.dashboard.review}</p>
              <p className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Search className="h-4 w-4 text-primary" /> {d.dashboard.analysisLabel}
              </p>
              <p className="text-sm text-muted-foreground mt-auto">
                {d.dashboard.remaining} <span className="font-semibold text-foreground">{user.docReviewRemaining ?? 0}</span>
              </p>
            </div>
          </Link>
        )}
      </div>
      </AnimateIn>

      {/* My Plan & Usage */}
      <AnimateIn delay={80}>
      <Card className="mb-8 border-t-[3px] border-t-primary rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>{d.dashboard.myPlanUsage}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="capitalize font-medium">{planLabel}</span>
                {subStatus && (
                  <Badge variant={subStatus === "active" ? "default" : "secondary"}>
                    {subStatus}
                  </Badge>
                )}
                {periodEnd && (
                  <span className="text-xs">
                    {d.dashboard.activeUntil} {periodEnd}{d.dashboard.activeUntilSuffix}
                  </span>
                )}
              </CardDescription>
            </div>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" }) + " btn-hover"}>
              <CreditCard className="mr-2 h-4 w-4" /> {d.dashboard.manage}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <UsageRow
            label={d.dashboard.consultations}
            usedLabel={d.dashboard.usedLabel}
            leftLabel={d.dashboard.leftLabel}
            used={consultUsed}
            total={consultLimit}
          />
          {showGenerate && (
            <UsageRow
              label={d.dashboard.docGeneration}
              usedLabel={d.dashboard.usedLabel}
              leftLabel={d.dashboard.leftLabel}
              used={docGenUsed}
              total={genLimit}
            />
          )}
          {showReview && (
            <UsageRow
              label={d.dashboard.docReview}
              usedLabel={d.dashboard.usedLabel}
              leftLabel={d.dashboard.leftLabel}
              used={reviewUsed}
              total={reviewLimit}
            />
          )}
          {plan === "free" && (
            <p className="text-xs text-muted-foreground mt-3">
              {d.dashboard.upgradePrompt}{" "}
              <Link href="/pricing" className="underline text-primary">
                {d.dashboard.upgradeCta}
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
      </AnimateIn>

      {/* History links */}
      <AnimateIn delay={160}>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/dashboard/consultations">
          <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
            <p className="font-bold text-base flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-primary" /> {d.dashboard.consultHistory}
            </p>
            <p className="text-sm text-muted-foreground">{d.dashboard.allQnA}</p>
          </div>
        </Link>
        {showGenerate && (
          <Link href="/dashboard/documents">
            <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
              <p className="font-bold text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> {d.dashboard.generatedDocs}
              </p>
              <p className="text-sm text-muted-foreground">{d.dashboard.downloadView}</p>
            </div>
          </Link>
        )}
        {showReview && (
          <Link href="/dashboard/reviews">
            <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
              <p className="font-bold text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> {d.dashboard.reviewResults}
              </p>
              <p className="text-sm text-muted-foreground">{d.dashboard.analysisHistory}</p>
            </div>
          </Link>
        )}
      </div>
      </AnimateIn>

      {/* Recent consultations */}
      <AnimateIn delay={240}>
      <Card className="rounded-2xl border-t-[3px] border-t-primary">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{d.dashboard.recentConsultations}</CardTitle>
            <CardDescription>{d.dashboard.latest5}</CardDescription>
          </div>
          <Link
            href="/dashboard/consultations"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {d.dashboard.viewAll}
          </Link>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {d.dashboard.noHistory}{" "}
              <Link href="/chat" className="underline">
                {d.dashboard.startHere}
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
                        {created ? new Date(created).toLocaleDateString(dateLocale) : ""}
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
      </AnimateIn>
    </div>
    </div>
  );
}
