"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, MessagesSquare, FileText, FileSearch, Clock, ArrowRight, User, LayoutList, CreditCard, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConsultationsGrid, type ConsultationItem } from "./consultations/consultations-grid";
import { DocumentsList, type GeneratedDocItem } from "./documents/documents-list";
import { ReviewsGrid, type ReviewItem } from "./reviews/reviews-grid";
import type { LimitMetric } from "@/components/site/limits-dialog";
import type { Dict } from "@/lib/i18n/dictionaries";

type Tab = "limits" | "profile" | "consultations" | "reviews" | "documents" | "templates";

type CustomMetric = { key: string; label: string; icon: React.ReactNode; remaining: number };

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

        {metrics.map((m) => (
          <div key={m.key} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {m.icon}
                {m.label}
              </div>
              <span className="text-xl font-bold tabular-nums text-gold">{m.used}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {m.isUnlimited ? dp.unlimited : `${dp.remainingOf}: ${m.remaining} / ${m.total}`}
            </p>
          </div>
        ))}

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
}: {
  d: Dict;
  name: string;
  email: string;
  initials: string;
  planLabel: string;
  statusLabel: string | null;
  planExpiresLabel: string | null;
}) {
  const dp = d.profile;
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
          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{name}</p>
            <p className="text-sm text-gold truncate">{email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Badge variant={planLabel === dp.planFree ? "secondary" : "default"}>{planLabel}</Badge>
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
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" }) + " mt-5"}>
          <CreditCard className="mr-2 h-4 w-4 text-gold" />
          {dp.subscription}
        </Link>
      </div>
    </div>
  );
}

function ReviewsPanel({ d, items }: { d: Dict; items: ReviewItem[] }) {
  const dp = d.profile;
  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-gold" />
          {dp.analysisResults}
        </h3>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            {dp.noReviews}{" "}
            <Link href="/services?tab=docs" className="underline text-gold">
              {dp.uploadDoc}
            </Link>
          </p>
        ) : (
          <ReviewsGrid items={items} />
        )}
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
  consultations,
  documents,
  templates,
  reviews,
  showGenerate,
  showReview,
  showTemplates,
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
  consultations: ConsultationItem[];
  documents: GeneratedDocItem[];
  templates: GeneratedDocItem[];
  reviews: ReviewItem[];
  showGenerate: boolean;
  showReview: boolean;
  showTemplates: boolean;
}) {
  const dp = d.profile;

  const tabs: { key: Tab; label: string; icon: LucideIcon; enabled: boolean }[] = [
    { key: "limits", label: dp.limits, icon: BarChart3, enabled: true },
    { key: "profile", label: dp.myProfile, icon: User, enabled: true },
    { key: "consultations", label: dp.aiConsultations, icon: MessagesSquare, enabled: true },
    { key: "reviews", label: dp.analysisResults, icon: FileSearch, enabled: showReview },
    { key: "documents", label: dp.generatedDocs, icon: FileText, enabled: showGenerate },
    { key: "templates", label: dp.usedTemplates, icon: LayoutList, enabled: showTemplates },
  ];
  const enabledTabs = tabs.filter((t) => t.enabled);
  const requested = enabledTabs.find((t) => t.key === initialTab)?.key;
  const [activeTab, setActiveTab] = useState<Tab>(requested ?? enabledTabs[0]?.key ?? "limits");

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <aside className="w-full md:w-72 shrink-0">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2 md:sticky md:top-24">
          <div className="px-2 pb-2">
            <h2 className="text-lg font-bold text-foreground">{dp.sidebarHeading}</h2>
            <p className="text-xs text-muted-foreground">{dp.sidebarSubtitle}</p>
          </div>
          {enabledTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
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

        {isFreePlan && (
          <div className="bg-card border border-border rounded-2xl p-4 mt-4">
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
      <section className="flex-1 min-w-0 h-[75vh] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
            <ReviewsPanel d={d} items={reviews} />
          </div>
        )}
      </section>
    </div>
  );
}
