import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MessagesSquare,
  FileText,
  FileSearch,
  CreditCard,
  Clock,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Subscription } from "@/lib/models/subscription";
import { Consultation } from "@/lib/models/consultation";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { DocumentReview } from "@/lib/models/document-review";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPlanByKey } from "@/lib/plans-db";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { AnimateIn } from "@/components/site/AnimateIn";
import { LimitsDialog, type LimitMetric } from "@/components/site/limits-dialog";
import { ReviewModalTriggerLink } from "@/components/site/review-modal-trigger-link";
import { DOC_TYPES } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [session, locale] = await Promise.all([auth(), getLocale()]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const d = getDict(locale);
  const dp = d.profile;
  const dateLocale = locale === "en" ? "en-GB" : "ka-GE";

  await dbConnect();
  const [user, sub, flags, consultations, documents, reviews, consultationsCount, documentsCount, reviewsCount, templatesCount] =
    await Promise.all([
      User.findById(session.user.id).select("-passwordHash").lean(),
      Subscription.findOne({ userId: session.user.id }).lean(),
      getFeatureFlags(),
      Consultation.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      GeneratedDocument.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      DocumentReview.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      Consultation.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: "ai" }),
      DocumentReview.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: "template" }),
    ]);
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const plan = user.plan ?? "free";
  const planData = await getPlanByKey(plan);

  const consultLimit = planData?.consultations ?? 9;
  const showGenerate = flags.generate && planData ? planData.includeDocGeneration : false;
  const showReview = flags.review && planData ? planData.includeDocReview : false;
  const showTemplates = flags.templates && planData ? planData.includeDocTemplates : false;
  const genLimit = showGenerate ? (planData?.docGeneration ?? 0) : 0;
  const reviewLimit = showReview ? (planData?.docReview ?? 0) : 0;
  const templatesLimit = showTemplates ? (planData?.docTemplates ?? 0) : 0;

  const consultRemaining = user.consultationsRemaining ?? 0;
  const docGenRemaining = user.docGenerationRemaining ?? 0;
  const docReviewRemaining = user.docReviewRemaining ?? 0;
  const docTemplatesRemaining = user.docTemplatesRemaining ?? 0;

  const subStatus = user.subscriptionStatus || (sub as { status?: string } | null)?.status || null;
  const periodEnd = (sub as { currentPeriodEnd?: Date } | null)?.currentPeriodEnd
    ? new Date((sub as { currentPeriodEnd: Date }).currentPeriodEnd).toLocaleDateString(dateLocale)
    : null;

  const PLAN_LABELS: Record<string, string> = {
    free: dp.planFree,
    standard: dp.planStandard,
    premium: dp.planPremium,
  };
  const STATUS_LABELS: Record<string, string> = {
    active: dp.statusActive,
    on_hold: dp.statusOnHold,
    cancelled: dp.statusCancelled,
    expired: dp.statusExpired,
    failed: dp.statusFailed,
  };

  const initials = (user.name ?? "?")
    .split(" ")
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const limitMetrics: LimitMetric[] = [
    {
      key: "consultations",
      label: dp.questionsAsked,
      icon: <MessagesSquare className="h-4 w-4 text-primary" />,
      used: consultationsCount,
      remaining: consultRemaining,
      total: consultLimit,
      isUnlimited: isAdmin || consultLimit >= 9999,
    },
    ...(showGenerate
      ? [
          {
            key: "generate",
            label: dp.documentsGenerated,
            icon: <FileText className="h-4 w-4 text-primary" />,
            used: documentsCount,
            remaining: docGenRemaining,
            total: genLimit,
            isUnlimited: isAdmin || genLimit >= 9999,
          },
        ]
      : []),
    ...(showReview
      ? [
          {
            key: "review",
            label: dp.documentsAnalyzed,
            icon: <FileSearch className="h-4 w-4 text-primary" />,
            used: reviewsCount,
            remaining: docReviewRemaining,
            total: reviewLimit,
            isUnlimited: isAdmin || reviewLimit >= 9999,
          },
        ]
      : []),
    ...(showTemplates
      ? [
          {
            key: "templates",
            label: dp.templatesFilled,
            icon: <FileText className="h-4 w-4 text-primary" />,
            used: templatesCount,
            remaining: docTemplatesRemaining,
            total: templatesLimit,
            isUnlimited: isAdmin || templatesLimit >= 9999,
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* ── Header ─────────────────────────────────────── */}
      <section className="bg-slate-900">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 select-none">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight truncate animate-fade-up">
                {user.name}
              </h1>
              <p className="text-xl font-semibold text-gold mt-2 truncate animate-fade-up delay-150">
                {user.email}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant={plan === "free" ? "secondary" : "default"}>
                  {PLAN_LABELS[plan] ?? plan}
                </Badge>
                {subStatus && (
                  <Badge variant={subStatus === "active" ? "default" : "destructive"} className="text-xs">
                    {STATUS_LABELS[subStatus] ?? subStatus}
                  </Badge>
                )}
                {periodEnd && (
                  <span className="text-xs text-white/60 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {periodEnd}
                    {dp.untilSuffix}
                  </span>
                )}
              </div>
            </div>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" }) + " btn-hover"}>
              <CreditCard className="mr-2 h-4 w-4" />
              {dp.subscription}
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* ── Limits / Services ──────────────────────────── */}
        <AnimateIn delay={0}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <LimitsDialog
              metrics={limitMetrics}
              triggerLabel={dp.limits}
              triggerSubtitle={dp.limitsSubtitle}
              title={dp.limits}
              subtitle={dp.limitsDialogSubtitle}
              remainingLabel={dp.remainingOf}
              unlimitedLabel={dp.unlimited}
            />
            <Link
              href="/services"
              className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-6 card-hover h-full flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{d.footer.nav.services}</p>
                <p className="text-sm text-muted-foreground mt-1">{dp.servicesSubtitle}</p>
              </div>
            </Link>
          </div>
          {plan === "free" && (
            <Card className="mb-8 border-primary/30 bg-primary/5 card-hover">
              <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-sm">{dp.upgradeTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dp.upgradeBody}</p>
                </div>
                <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
                  {dp.upgradeCta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </CardContent>
            </Card>
          )}
        </AnimateIn>

        {/* ── Consultation history preview ───────────────── */}
        <AnimateIn delay={160}>
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <MessagesSquare className="h-4 w-4" />
                {dp.aiConsultations}
              </h2>
              <Link href="/dashboard/consultations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {dp.viewAll}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            <Card className="card-hover border-t-[3px] border-t-primary">
              <CardContent className="py-0">
                {consultations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {dp.noConsultations}{" "}
                    <Link href="/chat" className="underline text-primary">
                      {dp.startChat}
                    </Link>
                  </p>
                ) : (
                  <div className="divide-y">
                    {consultations.map((c) => {
                      const id = String((c as { _id: unknown })._id);
                      const created = (c as { createdAt?: Date }).createdAt;
                      return (
                        <div key={id} className="py-3 flex items-start justify-between gap-4">
                          <p className="text-sm truncate flex-1 font-medium">{c.question}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {created ? new Date(created).toLocaleDateString(dateLocale) : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </AnimateIn>

        {/* ── Generated documents preview ────────────────── */}
        {showGenerate && (
          <AnimateIn delay={240}>
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {dp.generatedDocs}
                </h2>
                <Link href="/dashboard/documents" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {dp.viewAll}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
              <Card className="card-hover border-t-[3px] border-t-primary">
                <CardContent className="py-0">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {dp.noDocs}{" "}
                      <Link href="/generate" className="underline text-primary">
                        {dp.createDoc}
                      </Link>
                    </p>
                  ) : (
                    <div className="divide-y">
                      {documents.map((doc) => {
                        const id = String((doc as { _id: unknown })._id);
                        const created = (doc as { createdAt?: Date }).createdAt;
                        const typeName = DOC_TYPES[doc.type as keyof typeof DOC_TYPES] ?? doc.type;
                        return (
                          <div key={id} className="py-3 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">{typeName}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {created ? new Date(created).toLocaleDateString(dateLocale) : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </AnimateIn>
        )}

        {/* ── Document review history preview ────────────── */}
        {showReview && (
          <AnimateIn delay={320}>
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2 text-sm">
                  <FileSearch className="h-4 w-4" />
                  {dp.analysisResults}
                </h2>
                <Link href="/dashboard/reviews" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  {dp.viewAll}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
              <Card className="card-hover border-t-[3px] border-t-primary">
                <CardContent className="py-0">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {dp.noReviews}{" "}
                      <ReviewModalTriggerLink
                        label={dp.uploadDoc}
                        locale={locale}
                        className="underline text-primary"
                      />
                    </p>
                  ) : (
                    <div className="divide-y">
                      {reviews.map((r) => {
                        const id = String((r as { _id: unknown })._id);
                        const created = (r as { createdAt?: Date }).createdAt;
                        return (
                          <div key={id} className="py-3">
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <p className="text-sm font-medium truncate flex-1">{r.fileName ?? "document"}</p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {created ? new Date(created).toLocaleDateString(dateLocale) : ""}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{r.summary}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </AnimateIn>
        )}
      </div>
    </div>
  );
}
