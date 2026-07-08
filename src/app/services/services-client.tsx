"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ScanSearch,
  FileText,
  Search,
  Send,
  Loader2,
  User,
  ArrowRight,
  Scale,
  Home,
  Briefcase,
  Gavel,
  Mail,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DocumentAnalysisPanel } from "@/components/site/document-analysis-modal";
import { PageHero } from "@/components/site/PageHero";
import { DOC_TYPES } from "@/app/generate/generate-client";
import { getDict } from "@/lib/i18n/dictionaries";
import { renderMarkdownBold } from "@/lib/markdown-bold";
import { groupItemsByArticle } from "@/lib/legal/citations";
import { pick, pickArr } from "@/lib/i18n/loc";
import type { Locale } from "@/lib/i18n/config";
import type { FeatureFlagsData } from "@/lib/features";
import type { PlanData } from "@/lib/plans-db";

type Tab = "ai" | "docs" | "templates";

type LegalBasisGroup = {
  lawName: string;
  url: string;
  items: { article: string; paragraph: string | null; subparagraph: string | null }[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  legalBasis?: LegalBasisGroup[];
};

const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

const TEMPLATE_META: Record<string, { icon: LucideIcon; description: string }> = {
  complaint: { icon: Scale, description: "წარადგინეთ ოფიციალური საჩივარი შესაბამის ორგანოში" },
  "rental-agreement": { icon: Home, description: "ბინის ან კომერციული ფართის იჯარის სრული დოკუმენტი" },
  "employment-contract": { icon: Briefcase, description: "სტანდარტული ხელშეკრულება დამსაქმებელსა და დასაქმებულს შორის" },
  "power-of-attorney": { icon: Gavel, description: "წარმომადგენლობის უფლების მინიჭება სხვადასხვა ინსტანციაში" },
  "demand-letter": { icon: Mail, description: "ფორმალური მოთხოვნის წერილი დავალიანების ან ვალდებულების შესახებ" },
  "termination-notice": { icon: UserMinus, description: "შრომითი ხელშეკრულების შეწყვეტის ოფიციალური შეტყობინება" },
};

function AiConsultPanel({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const sm = d.servicesModal;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: "greeting", role: "assistant", content: d.chat.howCanIHelp },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const patch = (fn: (msg: Message) => Message) =>
      setMessages((m) => m.map((msg) => (msg.id === assistantId ? fn(msg) : msg)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      const ct = res.headers.get("content-type") ?? "";

      if (ct.includes("application/json")) {
        const data = await res.json();
        const rawContent = data.answer ?? data.error ?? d.chat.errorGeneric;
        const content = rawContent.trim() === NOT_FOUND_MSG ? d.chat.notFound : rawContent;
        patch((msg) => ({
          ...msg,
          content,
          legalBasis: rawContent.trim() === NOT_FOUND_MSG ? [] : data.legalBasis ?? [],
        }));
        return;
      }

      let legalBasis: LegalBasisGroup[] = [];
      const raw = res.headers.get("X-Legal-Basis");
      if (raw) {
        try {
          legalBasis = JSON.parse(decodeURIComponent(raw));
        } catch {
          legalBasis = [];
        }
      }

      if (!res.body) {
        patch((msg) => ({ ...msg, content: d.chat.errorNoBody, legalBasis }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch((msg) => ({ ...msg, content: acc }));
      }
      const isNotFound = acc.trim() === NOT_FOUND_MSG;
      patch((msg) => ({
        ...msg,
        content: isNotFound ? d.chat.notFound : acc,
        legalBasis: isNotFound ? [] : legalBasis,
      }));
    } catch {
      patch((msg) => ({ ...msg, content: d.chat.errorNetwork }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border bg-muted/30 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">{sm.aiTab}</h3>
          <p className="text-xs text-muted-foreground">{sm.aiSubtitle}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            <div
              className={`p-4 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-muted rounded-tl-none"
              }`}
            >
              {m.content ? (
                renderMarkdownBold(m.content)
              ) : (
                <span className="text-muted-foreground">{d.chat.writing}</span>
              )}
              {m.legalBasis && m.legalBasis.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-border/60 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground">{d.chat.legalBasis}</p>
                  {m.legalBasis.map((g) => {
                    const articleGroups = groupItemsByArticle(g.items);
                    return (
                      <div key={g.url} className="space-y-0.5">
                        <p className="text-xs font-medium">{g.lawName}:</p>
                        <ul className="ml-1 space-y-0.5">
                          {articleGroups.map(({ article, points }) => (
                            <li key={article} className="text-xs text-muted-foreground">
                              {article}
                              {points.length > 1 && (
                                <>, {d.chat.articlePoints} {points.join("; ")}</>
                              )}
                              {points.length === 1 && (
                                <>, {d.chat.articlePoint} {points[0]}</>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="p-4 border-t border-border shrink-0">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={d.chat.placeholder}
            rows={2}
            className="pr-12 resize-none bg-background"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8"
            disabled={loading}
            onClick={() => send(input)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-[10px] text-center mt-2 text-muted-foreground">{d.chat.disclaimer}</p>
      </footer>
    </div>
  );
}

function TemplatesPanel({ sm }: { sm: ReturnType<typeof getDict>["servicesModal"] }) {
  const [query, setQuery] = useState("");
  const filtered = DOC_TYPES.filter((t) => t.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-primary">{sm.customDocsTab}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sm.customDocsHint}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={sm.templatesSearchPlaceholder}
            className="bg-muted rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((t) => {
            const meta = TEMPLATE_META[t.value];
            const Icon = meta?.icon ?? FileText;
            return (
              <Link
                key={t.value}
                href={`/generate?type=${t.value}`}
                className="p-5 border border-border rounded-xl hover:shadow-md transition-shadow group bg-card"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                  {t.label}
                </h4>
                {meta && <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>}
                <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {sm.generateCta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground py-10">
              {sm.templatesNoResults}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UpgradeCard({ plan, locale, d }: { plan: PlanData | null; locale: Locale; d: ReturnType<typeof getDict> }) {
  if (!plan) return null;
  const name = pick(plan.name, plan.nameEn, locale);
  const base = pickArr(plan.features, plan.featuresEn, locale);
  const gen = plan.includeDocGeneration ? pickArr(plan.featuresDocGeneration, plan.featuresDocGenerationEn, locale) : [];
  const rev = plan.includeDocReview ? pickArr(plan.featuresDocReview, plan.featuresDocReviewEn, locale) : [];
  const body = [...base, ...gen, ...rev].slice(0, 3).join(", ");
  const title = locale === "en" ? `Upgrade to ${name}` : `განაახლე ${name}-ზე`;

  return (
    <div className="p-3 bg-card border border-border rounded-lg">
      <p className="text-sm font-bold text-primary mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-3">{body}</p>
      <Link href="/pricing" className="block">
        <Button size="sm" className="w-full">
          {d.profile.upgradeCta}
        </Button>
      </Link>
    </div>
  );
}

export function ServicesPageClient({
  locale,
  flags,
  upgradePlan,
}: {
  locale: Locale;
  flags: FeatureFlagsData;
  upgradePlan: PlanData | null;
}) {
  const d = getDict(locale);
  const sm = d.servicesModal;

  const tabs: { key: Tab; label: string; icon: LucideIcon; enabled: boolean }[] = [
    { key: "ai", label: sm.aiTab, icon: Sparkles, enabled: flags.chat },
    { key: "docs", label: d.documentAnalysis.title, icon: ScanSearch, enabled: flags.review },
    { key: "templates", label: sm.customDocsTab, icon: FileText, enabled: flags.generate },
  ];
  const enabledTabs = tabs.filter((t) => t.enabled);
  const [activeTab, setActiveTab] = useState<Tab>(enabledTabs[0]?.key ?? "ai");

  return (
    <div>
      <PageHero title={d.services.title} subtitle={d.services.subtitle} />

      <div className="container mx-auto px-4 py-10">
        {enabledTabs.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{sm.templatesNoResults}</p>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <aside className="w-full md:w-72 shrink-0">
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2 md:sticky md:top-24">
                <div className="px-2 pb-2">
                  <h2 className="text-lg font-bold text-foreground">{sm.sidebarHeading}</h2>
                  <p className="text-xs text-muted-foreground">{sm.sidebarSubtitle}</p>
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
                    <t.icon className="h-4 w-4 shrink-0" />
                    {t.label}
                  </button>
                ))}

                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-destructive mb-1">{sm.warningLabel}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{d.chat.disclaimer}</p>
                  </div>
                  <UpgradeCard plan={upgradePlan} locale={locale} d={d} />
                </div>
              </div>
            </aside>

            {/* Canvas */}
            <section className="flex-1 min-w-0 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[650px]">
              {activeTab === "ai" && flags.chat && <AiConsultPanel locale={locale} />}
              {activeTab === "docs" && flags.review && (
                <div className="p-6 overflow-y-auto">
                  <DocumentAnalysisPanel locale={locale} />
                </div>
              )}
              {activeTab === "templates" && flags.generate && <TemplatesPanel sm={sm} />}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
