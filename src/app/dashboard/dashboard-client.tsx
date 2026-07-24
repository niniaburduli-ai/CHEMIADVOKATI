"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { BarChart3, MessagesSquare, FileText, FileSearch, Clock, ArrowRight, User, LayoutList, CreditCard, KeyRound, Calendar, Receipt, type LucideIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConsultationsGrid, type ConsultationItem } from "./consultations/consultations-grid";
import { DocumentsList, type GeneratedDocItem } from "./documents/documents-list";
import { ReviewsGrid, type ReviewItem } from "./reviews/reviews-grid";
import { updateProfileAction, type ProfileUpdateState } from "@/actions/profile";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/actions/password-reset";
import { CancelSubscriptionButton } from "@/components/site/cancel-subscription-button";
import type { LimitMetric } from "@/components/site/limits-dialog";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

type Tab = "limits" | "profile" | "billing" | "consultations" | "reviews" | "documents" | "templates";

type CustomMetric = { key: string; label: string; icon: React.ReactNode; remaining: number };

export type BillingPaymentItem = {
  id: string;
  planLabel: string;
  amount: string;
  statusLabel: string;
  paidAtLabel: string;
};

function LimitsPanel({
  d,
  metrics,
  planLabel,
  planExpiresLabel,
  hasCustomPlan,
  customExpiresLabel,
  customMetrics,
}: {
  d: Dict;
  metrics: LimitMetric[];
  planLabel: string;
  planExpiresLabel: string | null;
  hasCustomPlan: boolean;
  customExpiresLabel: string | null;
  customMetrics: CustomMetric[];
}) {
  const dp = d.profile;
  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gold" />
          {dp.limits}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{dp.limitsDialogSubtitle}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
          <span className="text-sm font-medium text-foreground">{planLabel}</span>
          {planExpiresLabel && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-gold" />
              {dp.planExpiresPrefix} {planExpiresLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.key} className="rounded-xl border border-border p-3 flex flex-col gap-2 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground min-w-0">
                {m.icon}
                <span className="truncate">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums text-gold">{m.used}</span>
                {!m.isUnlimited && (
                  <span className="text-xs text-muted-foreground">/ {m.total}</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {m.isUnlimited ? dp.unlimited : `${dp.remainingOf}: ${m.remaining}`}
              </p>
            </div>
          ))}
        </div>

        {hasCustomPlan && (
          <div className="rounded-xl border border-t-[3px] border-t-gold border-border p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <span className="text-sm font-semibold text-foreground">{dp.customPackageTitle}</span>
              <span className="text-xs text-muted-foreground">
                {dp.customPackageExpiresPrefix} {customExpiresLabel}
              </span>
            </div>
            {customMetrics.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {customMetrics.map((m) => (
                  <div key={m.key} className="flex items-center gap-2 text-sm">
                    {m.icon}
                    <div>
                      <div className="font-semibold tabular-nums">{m.remaining}</div>
                      <div className="text-xs text-muted-foreground">{m.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{dp.customPackageDepleted}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePanel({
  d,
  name,
  email,
  initials,
  planLabel,
  statusLabel,
  planExpiresLabel,
  firstName,
  lastName,
  personalNumber,
  phone,
}: {
  d: Dict;
  name: string;
  email: string;
  initials: string;
  planLabel: string;
  statusLabel: string | null;
  planExpiresLabel: string | null;
  firstName: string;
  lastName: string;
  personalNumber: string;
  phone: string;
}) {
  const dp = d.profile;
  const [profileState, profileFormAction, profilePending] = useActionState<ProfileUpdateState, FormData>(
    updateProfileAction,
    undefined
  );
  const [resetState, resetFormAction, resetPending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordResetAction,
    undefined
  );

  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-gold" />
          {dp.myProfile}
        </h3>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`h-14 w-14 rounded-full bg-primary flex items-center justify-center text-lg font-bold shrink-0 select-none ${
              planLabel === dp.planPremium ? "text-gold" : "text-primary-foreground"
            }`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{name}</p>
            <p className="text-sm text-gold truncate">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge
            variant={planLabel === dp.planFree ? "secondary" : "default"}
            className={planLabel === dp.planPremium ? "text-gold" : undefined}
          >
            {planLabel}
          </Badge>
          {statusLabel && (
            <Badge variant={statusLabel === dp.statusActive ? "default" : "destructive"} className="text-xs">
              {statusLabel}
            </Badge>
          )}
          {planExpiresLabel && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-gold" />
              {planExpiresLabel}
              {dp.untilSuffix}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-5 flex-wrap">
          <form action={resetFormAction}>
            <input type="hidden" name="email" value={email} />
            <Button type="submit" variant="outline" size="sm" disabled={resetPending} className="border-gold">
              <KeyRound className="mr-2 h-4 w-4 text-gold" />
              {resetPending ? d.auth.forgotSending : d.auth.forgotSubmit}
            </Button>
          </form>
        </div>
        {resetState?.sent && (
          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-muted-foreground">{d.auth.forgotSentBody}</p>
            <p className="text-xs text-muted-foreground">{d.auth.forgotSpamHint}</p>
          </div>
        )}
        {resetState?.error && (
          <p className="text-xs text-destructive mt-2">{resetState.error}</p>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="text-sm font-bold text-foreground mb-1">{dp.personalInfoTitle}</h4>
          <p className="text-xs text-muted-foreground mb-3">{dp.personalInfoHint}</p>
          <form action={profileFormAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{dp.firstNameLabel}</Label>
              <Input id="firstName" name="firstName" defaultValue={firstName} />
              {profileState?.fields?.firstName && (
                <p className="text-xs text-destructive">{profileState.fields.firstName[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{dp.lastNameLabel}</Label>
              <Input id="lastName" name="lastName" defaultValue={lastName} />
              {profileState?.fields?.lastName && (
                <p className="text-xs text-destructive">{profileState.fields.lastName[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="personalNumber">{dp.personalNumberLabel}</Label>
              <Input id="personalNumber" name="personalNumber" defaultValue={personalNumber} />
              {profileState?.fields?.personalNumber && (
                <p className="text-xs text-destructive">{profileState.fields.personalNumber[0]}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{dp.phoneLabel}</Label>
              <Input id="phone" name="phone" defaultValue={phone} />
              {profileState?.fields?.phone && (
                <p className="text-xs text-destructive">{profileState.fields.phone[0]}</p>
              )}
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" size="sm" disabled={profilePending}>
                {profilePending ? dp.savingCta : dp.saveCta}
              </Button>
              {profileState?.ok && <span className="text-xs text-muted-foreground">{dp.savedMessage}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function BillingPanel({
  d,
  locale,
  planName,
  planPrice,
  isPaid,
  statusLabel,
  nextPaymentLabel,
  canCancel,
  payments,
}: {
  d: Dict;
  locale: Locale;
  planName: string;
  planPrice: string;
  isPaid: boolean;
  statusLabel: string | null;
  nextPaymentLabel: string | null;
  canCancel: boolean;
  payments: BillingPaymentItem[];
}) {
  const db = d.billing;
  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-gold" />
          {db.currentPlan}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isPaid ? db.activeSub : db.freePlanLabel}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="rounded-xl border border-border p-4">
          <div className="flex justify-between items-start flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{planName}</span>
              <span className="text-muted-foreground text-sm">— {planPrice}</span>
            </div>
            {statusLabel && <Badge variant={isPaid ? "default" : "secondary"}>{statusLabel}</Badge>}
          </div>
          {isPaid && nextPaymentLabel && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 text-gold" />
              {db.nextPayment} {nextPaymentLabel}
            </div>
          )}
          <div className="mt-4 flex gap-2 flex-wrap">
            <Link href="/pricing" className={buttonVariants({ size: "sm" }) + " btn-hover"}>
              {isPaid ? db.changePlan : db.choosePlan}
            </Link>
            {canCancel && <CancelSubscriptionButton locale={locale} />}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold text-foreground mb-3">{db.paymentHistory}</h4>
          {payments.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Receipt className="h-4 w-4 text-gold" />
              {db.noPayments}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 space-y-3">
              {payments.map((p, i) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between py-1 flex-wrap gap-2">
                    <div>
                      <div className="font-medium text-sm">{p.planLabel}</div>
                      <div className="text-xs text-muted-foreground">{p.paidAtLabel}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{p.amount}</span>
                      <Badge variant="secondary">{p.statusLabel}</Badge>
                    </div>
                  </div>
                  {i < payments.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({
  d,
  initialTab,
  limitMetrics,
  planLabel,
  planExpiresLabel,
  hasCustomPlan,
  customExpiresLabel,
  customMetrics,
  isFreePlan,
  profileName,
  profileEmail,
  profileInitials,
  profileStatusLabel,
  profileFirstName,
  profileLastName,
  profilePersonalNumber,
  profilePhone,
  consultations,
  documents,
  templates,
  reviews,
  showGenerate,
  showReview,
  showTemplates,
  locale,
  billingPlanName,
  billingPlanPrice,
  billingIsPaid,
  billingStatusLabel,
  billingNextPaymentLabel,
  billingCanCancel,
  billingPayments,
}: {
  d: Dict;
  initialTab?: string;
  limitMetrics: LimitMetric[];
  planLabel: string;
  planExpiresLabel: string | null;
  hasCustomPlan: boolean;
  customExpiresLabel: string | null;
  customMetrics: CustomMetric[];
  isFreePlan: boolean;
  profileName: string;
  profileEmail: string;
  profileInitials: string;
  profileStatusLabel: string | null;
  profileFirstName: string;
  profileLastName: string;
  profilePersonalNumber: string;
  profilePhone: string;
  consultations: ConsultationItem[];
  documents: GeneratedDocItem[];
  templates: GeneratedDocItem[];
  reviews: ReviewItem[];
  showGenerate: boolean;
  showReview: boolean;
  showTemplates: boolean;
  locale: Locale;
  billingPlanName: string;
  billingPlanPrice: string;
  billingIsPaid: boolean;
  billingStatusLabel: string | null;
  billingNextPaymentLabel: string | null;
  billingCanCancel: boolean;
  billingPayments: BillingPaymentItem[];
}) {
  const dp = d.profile;

  const cabinetTabs: { key: Tab; label: string; icon: LucideIcon; enabled: boolean }[] = [
    { key: "profile", label: dp.myProfile, icon: User, enabled: true },
    { key: "limits", label: dp.limits, icon: BarChart3, enabled: true },
    { key: "billing", label: dp.subscription, icon: CreditCard, enabled: true },
  ];
  const historyTabs: { key: Tab; label: string; icon: LucideIcon; enabled: boolean }[] = [
    { key: "consultations", label: dp.aiConsultations, icon: MessagesSquare, enabled: true },
    { key: "reviews", label: dp.analysisResults, icon: FileSearch, enabled: showReview },
    { key: "documents", label: dp.generatedDocs, icon: FileText, enabled: showGenerate },
    { key: "templates", label: dp.usedTemplates, icon: LayoutList, enabled: showTemplates },
  ];
  const enabledTabs = [...cabinetTabs, ...historyTabs].filter((t) => t.enabled);
  const requested = enabledTabs.find((t) => t.key === initialTab)?.key;
  const [activeTab, setActiveTab] = useState<Tab>(requested ?? "limits");

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <aside className="w-full md:w-80 shrink-0 space-y-3">
        <div className="bg-card border border-border rounded-2xl p-3 space-y-1.5 md:sticky md:top-24">
          <div className="px-2 pb-1.5">
            <h2 className="text-lg font-bold text-foreground">{dp.sidebarHeading}</h2>
          </div>
          {cabinetTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0 text-gold" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-3 space-y-1.5">
          <div className="px-2 pb-1.5">
            <h2 className="text-lg font-bold text-foreground">{dp.serviceHistoryHeading}</h2>
          </div>
          {historyTabs.filter((t) => t.enabled).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                activeTab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <t.icon className="h-4 w-4 shrink-0 text-gold" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
          <div className="px-2 pb-1.5">
            <h2 className="text-lg font-bold text-foreground">{dp.servicesCardTitle}</h2>
          </div>
          <div className="px-2">
            <Link href="/services" className={buttonVariants({ size: "sm" }) + " w-full"}>
              {dp.returnToServices}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {isFreePlan && (
          <div className="bg-card border border-border rounded-2xl p-3 mt-3">
            <p className="text-sm font-bold text-foreground mb-1">{dp.upgradeTitle}</p>
            <p className="text-xs text-muted-foreground mb-3">{dp.upgradeBody}</p>
            <Link href="/pricing" className={buttonVariants({ size: "sm" }) + " w-full"}>
              {dp.upgradeCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        )}
      </aside>

      {/* Canvas */}
      <section className="flex-1 min-w-0 min-h-[520px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className={activeTab === "limits" ? "flex flex-col h-full min-h-0" : "hidden"}>
          <LimitsPanel
            d={d}
            metrics={limitMetrics}
            planLabel={planLabel}
            planExpiresLabel={planExpiresLabel}
            hasCustomPlan={hasCustomPlan}
            customExpiresLabel={customExpiresLabel}
            customMetrics={customMetrics}
          />
        </div>
        <div className={activeTab === "profile" ? "flex flex-col h-full min-h-0" : "hidden"}>
          <ProfilePanel
            d={d}
            name={profileName}
            email={profileEmail}
            initials={profileInitials}
            planLabel={planLabel}
            statusLabel={profileStatusLabel}
            planExpiresLabel={planExpiresLabel}
            firstName={profileFirstName}
            lastName={profileLastName}
            personalNumber={profilePersonalNumber}
            phone={profilePhone}
          />
        </div>
        <div className={activeTab === "billing" ? "flex flex-col h-full min-h-0" : "hidden"}>
          <BillingPanel
            d={d}
            locale={locale}
            planName={billingPlanName}
            planPrice={billingPlanPrice}
            isPaid={billingIsPaid}
            statusLabel={billingStatusLabel}
            nextPaymentLabel={billingNextPaymentLabel}
            canCancel={billingCanCancel}
            payments={billingPayments}
          />
        </div>
        <div className={activeTab === "consultations" ? "flex flex-col h-full min-h-0" : "hidden"}>
          <ConsultationsGrid items={consultations} d={d} />
        </div>
        {showGenerate && (
          <div className={activeTab === "documents" ? "flex flex-col h-full min-h-0" : "hidden"}>
            <DocumentsList docs={documents} d={d} />
          </div>
        )}
        {showTemplates && (
          <div className={activeTab === "templates" ? "flex flex-col h-full min-h-0" : "hidden"}>
            <DocumentsList
              docs={templates}
              d={d}
              heading={d.profile.usedTemplates}
              emptyText={d.profile.noTemplates}
              emptyCta={d.profile.fillTemplate}
              emptyHref="/services?tab=templates"
            />
          </div>
        )}
        {showReview && (
          <div className={activeTab === "reviews" ? "flex flex-col h-full min-h-0" : "hidden"}>
            <ReviewsGrid items={reviews} d={d} />
          </div>
        )}
      </section>
    </div>
  );
}
