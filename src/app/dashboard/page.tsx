import { redirect } from "next/navigation";
import {
  MessagesSquare,
  FileText,
  FileSearch,
  CreditCard,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Subscription } from "@/lib/models/subscription";
import { Consultation } from "@/lib/models/consultation";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { DocumentReview } from "@/lib/models/document-review";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPlanByKey } from "@/lib/plans-db";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { getFeatureFlags } from "@/lib/features";
import { getLocale } from "@/lib/i18n/locale";
import { getDict } from "@/lib/i18n/dictionaries";
import { computeWordDiff } from "@/lib/diff-text";
import type { RiskFinding } from "@/lib/legal/document-analysis";
import { DashboardClient } from "./dashboard-client";
import type { ConsultationItem, RawSource } from "./consultations/consultations-grid";
import type { GeneratedDocItem } from "./documents/documents-list";
import type { ReviewItem } from "./reviews/reviews-grid";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [session, locale, { tab }] = await Promise.all([auth(), getLocale(), searchParams]);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const d = getDict(locale);
  const dp = d.profile;
  const dateLocale = locale === "en" ? "en-GB" : "ka-GE";

  await dbConnect();
  const [userRaw, sub, flags, consultations, documents, reviews, consultationsCount, documentsCount, reviewsCount, templatesCount] =
    await Promise.all([
      User.findById(session.user.id).select("-passwordHash").lean(),
      Subscription.findOne({ userId: session.user.id }).lean(),
      getFeatureFlags(),
      Consultation.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(100).lean(),
      GeneratedDocument.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(100).lean(),
      DocumentReview.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(100).lean(),
      Consultation.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: { $ne: "template" } }),
      DocumentReview.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: "template" }),
    ]);
  if (!userRaw) redirect("/login");
  const user = await applyCustomPlanExpiryIfDue(await applyPlanExpiryIfDue(userRaw));

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

  const hasCustomPlan = !!user.customPlanExpiresAt && new Date(user.customPlanExpiresAt) > new Date();
  const customExpiresLabel = hasCustomPlan
    ? new Date(user.customPlanExpiresAt as Date).toLocaleDateString(dateLocale)
    : null;
  const customMetrics = hasCustomPlan
    ? (
        [
          { key: "consultations", label: dp.questionsAsked, icon: <MessagesSquare className="h-4 w-4 text-gold" />, remaining: user.customConsultationsRemaining ?? 0 },
          { key: "generate", label: dp.documentsGenerated, icon: <FileText className="h-4 w-4 text-gold" />, remaining: user.customDocGenerationRemaining ?? 0 },
          { key: "review", label: dp.documentsAnalyzed, icon: <FileSearch className="h-4 w-4 text-gold" />, remaining: user.customDocReviewRemaining ?? 0 },
          { key: "templates", label: dp.templatesFilled, icon: <FileText className="h-4 w-4 text-gold" />, remaining: user.customDocTemplatesRemaining ?? 0 },
        ] as { key: string; label: string; icon: React.ReactNode; remaining: number }[]
      ).filter((m) => m.remaining > 0)
    : [];

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

  const limitMetrics = [
    {
      key: "consultations",
      label: dp.questionsAsked,
      icon: <MessagesSquare className="h-4 w-4 text-gold" />,
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
            icon: <FileText className="h-4 w-4 text-gold" />,
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
            icon: <FileSearch className="h-4 w-4 text-gold" />,
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
            icon: <FileText className="h-4 w-4 text-gold" />,
            used: templatesCount,
            remaining: docTemplatesRemaining,
            total: templatesLimit,
            isUnlimited: isAdmin || templatesLimit >= 9999,
          },
        ]
      : []),
  ];

  const consultationItems: ConsultationItem[] = consultations.map((c) => {
    const item = c as unknown as {
      _id: unknown;
      question: string;
      answer: string;
      createdAt?: Date;
      sources?: RawSource[];
    };
    return {
      id: String(item._id),
      question: item.question,
      answer: item.answer,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      sources: item.sources ?? [],
    };
  });

  const allDocumentItems: GeneratedDocItem[] = documents.map((doc) => {
    const item = doc as unknown as {
      _id: unknown;
      title: string;
      type: string;
      content: string;
      createdAt?: Date;
      source?: string;
    };
    return {
      id: String(item._id),
      title: item.title,
      type: item.type,
      content: item.content,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
      source: item.source ?? "ai",
    };
  });
  const documentItems = allDocumentItems.filter((doc) => doc.source !== "template");
  const templateItems = allDocumentItems.filter((doc) => doc.source === "template");

  const reviewItems: ReviewItem[] = reviews.map((review) => {
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
                    <Clock className="h-3 w-3 text-gold" />
                    {periodEnd}
                    {dp.untilSuffix}
                  </span>
                )}
              </div>
            </div>
            <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" }) + " btn-hover"}>
              <CreditCard className="mr-2 h-4 w-4 text-gold" />
              {dp.subscription}
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <DashboardClient
          d={d}
          initialTab={tab}
          limitMetrics={limitMetrics}
          planLabel={PLAN_LABELS[plan] ?? plan}
          planExpiresLabel={periodEnd}
          hasCustomPlan={hasCustomPlan}
          customExpiresLabel={customExpiresLabel}
          customMetrics={customMetrics}
          isFreePlan={plan === "free"}
          profileName={user.name}
          profileEmail={user.email}
          profileInitials={initials}
          profileStatusLabel={subStatus ? STATUS_LABELS[subStatus] ?? subStatus : null}
          consultations={consultationItems}
          documents={documentItems}
          templates={templateItems}
          reviews={reviewItems}
          showGenerate={showGenerate}
          showReview={showReview}
          showTemplates={showTemplates}
        />
      </div>
    </div>
  );
}
