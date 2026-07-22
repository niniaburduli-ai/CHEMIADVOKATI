"use client";

import { useEffect, useRef, useState } from "react";
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
  LayoutTemplate,
  BookOpen,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentAnalysisPanel } from "@/components/site/document-analysis-modal";
import { PreviousCorrespondenceButton } from "@/components/site/previous-correspondence-panel";
import { PageHero } from "@/components/site/PageHero";
import { DOC_TYPES } from "@/app/generate/generate-client";
import { TEMPLATE_DOC_TYPES } from "@/app/templates/templates-client";
import { getDict } from "@/lib/i18n/dictionaries";
import { renderMarkdownBold } from "@/lib/markdown-bold";
import { groupItemsByArticle, splitRawSources, type RawSource } from "@/lib/legal/citations";
import { ChatStreamReader, type ChatStreamEvent } from "@/lib/streaming/chat-protocol";
import { randomId } from "@/lib/uuid";
import type { Locale } from "@/lib/i18n/config";
import type { FeatureFlagsData } from "@/lib/features";
import type { PlanData } from "@/lib/plans-db";

type Tab = "ai" | "docs" | "templates" | "templatesFill";

type LegalBasisGroup = {
  lawName: string;
  url: string;
  items: { article: string; paragraph: string | null; subparagraph: string | null }[];
};

type WebSource = { url: string; title: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  legalBasis?: LegalBasisGroup[];
  webSources?: WebSource[];
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
  const [unauthorized, setUnauthorized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/consultations");
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items as {
          id: string;
          question: string;
          answer: string;
          sources?: RawSource[];
        }[];
        if (items.length === 0) return;
        const history: Message[] = [...items].reverse().flatMap((item) => {
          const { legalBasis, webSources } = splitRawSources(item.sources ?? []);
          return [
            { id: `${item.id}-q`, role: "user" as const, content: item.question },
            { id: `${item.id}-a`, role: "assistant" as const, content: item.answer, legalBasis, webSources },
          ];
        });
        setMessages(history);
      } catch {
        // keep the greeting-only state on failure
      }
    })();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setUnauthorized(false);
    const userMsg: Message = { id: randomId(), role: "user", content: text };
    const assistantId = randomId();
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

      if (res.status === 401) {
        setMessages((m) => m.filter((msg) => msg.id !== assistantId && msg.id !== userMsg.id));
        setUnauthorized(true);
        return;
      }

      const ct = res.headers.get("content-type") ?? "";

      if (ct.includes("application/json")) {
        const data = await res.json();
        const rawContent = data.answer ?? data.error ?? d.chat.errorGeneric;
        const isTerminal = rawContent.trim() === NOT_FOUND_MSG;
        const content = isTerminal ? d.chat.notFound : rawContent;
        patch((msg) => ({
          ...msg,
          content,
          legalBasis: isTerminal ? [] : data.legalBasis ?? [],
          webSources: isTerminal ? [] : data.webSources ?? [],
        }));
        return;
      }

      if (!res.body) {
        patch((msg) => ({ ...msg, content: d.chat.errorNoBody }));
        return;
      }

      // Legal-basis citations arrive as a trailing in-band JSON payload, not
      // a response header — see ChatStreamReader for the full wire protocol
      // (also used by the main /chat page's client).
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const streamReader = new ChatStreamReader();
      let acc = "";
      let legalBasis: LegalBasisGroup[] = [];
      let webSources: WebSource[] = [];

      const applyEvents = (events: ChatStreamEvent[]) => {
        for (const ev of events) {
          if (ev.type === "prose") acc += ev.text;
          else if (ev.type === "reset") acc = "";
          else if (ev.type === "meta" && ev.data && typeof ev.data === "object") {
            const data = ev.data as { legalBasis?: LegalBasisGroup[]; webSources?: WebSource[] };
            legalBasis = data.legalBasis ?? [];
            webSources = data.webSources ?? [];
          }
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        applyEvents(streamReader.push(decoder.decode(value, { stream: true })));
        patch((msg) => ({ ...msg, content: acc }));
      }
      applyEvents(streamReader.finish());

      const isNotFound = acc.trim() === NOT_FOUND_MSG;
      patch((msg) => ({
        ...msg,
        content: isNotFound ? d.chat.notFound : acc,
        legalBasis: isNotFound ? [] : legalBasis,
        webSources: isNotFound ? [] : webSources,
      }));
    } catch {
      patch((msg) => ({ ...msg, content: d.chat.errorNetwork }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">{sm.aiTab}</h3>
            <p className="text-xs text-muted-foreground">{sm.aiSubtitle}</p>
          </div>
        </div>
        <PreviousCorrespondenceButton locale={locale} />
      </header>

      <ScrollArea viewportRef={scrollRef} className="flex-1 min-h-0">
      <div className="p-5 space-y-4">
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
              {m.role === "user" ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-gold" />}
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
                      <div key={g.url} className="space-y-1">
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
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start gap-1.5 text-xs text-gold hover:underline"
                        >
                          <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gold" />
                          <span>{d.chat.source}</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
              {m.webSources && m.webSources.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground">{d.chat.webSources}</p>
                  <ul className="space-y-0.5">
                    {m.webSources.map((s) => (
                      <li key={s.url}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-xs text-gold hover:underline break-all"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      </ScrollArea>

      <footer className="p-4 border-t border-border shrink-0">
        {unauthorized && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <span>{d.documentAnalysis.loginRequired}</span>
            <Link href="/login?callbackUrl=/services" className="shrink-0">
              <Button size="sm">{d.documentAnalysis.loginCta}</Button>
            </Link>
          </div>
        )}
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
      <header className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-foreground">{sm.customDocsTab}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sm.customDocsHint}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gold" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={sm.templatesSearchPlaceholder}
            className="bg-muted rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const meta = TEMPLATE_META[t.value];
            const Icon = meta?.icon ?? FileText;
            return (
              <Link
                key={t.value}
                href={`/generate?type=${t.value}`}
                className="p-3 border border-border rounded-xl hover:shadow-md transition-shadow group bg-card"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-gold mb-2">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                  {t.label}
                </h4>
                {meta && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{meta.description}</p>}
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gold">
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
      <footer className="p-3 border-t border-border shrink-0">
        <p className="text-[10px] text-center text-muted-foreground">{sm.docGenDisclaimer}</p>
      </footer>
    </div>
  );
}

function TemplatesLinkPanel({ sm }: { sm: ReturnType<typeof getDict>["servicesModal"] }) {
  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b border-border shrink-0">
        <h3 className="text-lg font-bold text-foreground">{sm.templatesTab}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{sm.templatesHint}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMPLATE_DOC_TYPES.map((t) => {
            const meta = TEMPLATE_META[t.value];
            const Icon = meta?.icon ?? LayoutTemplate;
            return (
              <Link
                key={t.value}
                href={`/templates?type=${t.value}`}
                className="p-3 border border-border rounded-xl hover:shadow-md transition-shadow group bg-card"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-gold mb-2">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-foreground group-hover:text-gold transition-colors">
                  {t.label}
                </h4>
                {meta && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{meta.description}</p>}
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gold">
                  {sm.generateCta}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <footer className="p-3 border-t border-border shrink-0">
        <p className="text-[10px] text-center text-muted-foreground">{sm.templatesGenDisclaimer}</p>
      </footer>
    </div>
  );
}

function UpgradeCard({ plan, locale, d }: { plan: PlanData | null; locale: Locale; d: ReturnType<typeof getDict> }) {
  if (!plan) return null;
  const title = locale === "en" ? "Upgrade plan" : "განაახლე პაკეტი";

  return (
    <div>
      <p className="flex items-center gap-2 text-lg font-bold text-foreground mb-3">
        <Rocket className="h-4 w-4 shrink-0 text-gold" />
        {title}
      </p>
      <Link href="/pricing" className="block">
        <Button className="w-full h-10 rounded-full">
          {d.profile.upgradeCta}
        </Button>
      </Link>
    </div>
  );
}

const TAB_KEYS: Tab[] = ["ai", "docs", "templates", "templatesFill"];

export function ServicesPageClient({
  locale,
  flags,
  upgradePlan,
  initialTab,
  initialReviewId,
}: {
  locale: Locale;
  flags: FeatureFlagsData;
  upgradePlan: PlanData | null;
  initialTab?: string;
  initialReviewId?: string;
}) {
  const d = getDict(locale);
  const sm = d.servicesModal;

  const tabs: { key: Tab; label: string; icon: LucideIcon; enabled: boolean }[] = [
    { key: "ai", label: sm.aiTab, icon: Sparkles, enabled: flags.chat },
    { key: "docs", label: d.documentAnalysis.title, icon: ScanSearch, enabled: flags.review },
    { key: "templates", label: sm.customDocsTab, icon: FileText, enabled: flags.generate },
    { key: "templatesFill", label: sm.templatesTab, icon: LayoutTemplate, enabled: flags.templates },
  ];
  const enabledTabs = tabs.filter((t) => t.enabled);
  const requestedTab = TAB_KEYS.includes(initialTab as Tab) ? (initialTab as Tab) : undefined;
  const defaultTab = enabledTabs.find((t) => t.key === requestedTab)?.key ?? enabledTabs[0]?.key ?? "ai";
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div>
      <PageHero title={d.services.title} subtitle={d.services.subtitle} />

      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {enabledTabs.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{sm.templatesNoResults}</p>
        ) : (
          <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(18rem,1fr)_3fr]">
            {/* Sidebar */}
            <aside className="w-full flex flex-col gap-3 md:sticky md:top-24">
              <div className="bg-card border border-border rounded-2xl p-3 space-y-1.5 shrink-0">
                <div className="px-2 pb-1.5">
                  <h2 className="text-lg font-bold text-foreground">{sm.sidebarHeading}</h2>
                  <p className="text-xs text-muted-foreground">{sm.sidebarSubtitle}</p>
                </div>
                {enabledTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveTab(t.key)}
                    className={`w-full flex items-center gap-2 h-9 px-3 rounded-full transition-colors text-xs font-medium ${
                      activeTab === t.key
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <t.icon className="h-4 w-4 shrink-0 text-gold" />
                    <span className="min-w-0 truncate">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl p-3 shrink-0">
                <UpgradeCard plan={upgradePlan} locale={locale} d={d} />
              </div>

              <div className="bg-card border border-border rounded-2xl p-3 shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <User className="h-5 w-5 text-gold" />
                  <h3 className="text-lg font-bold text-foreground">{sm.cabinetTitle}</h3>
                </div>
                <ul className="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>{sm.cabinetLimitsItem}</li>
                  <li>{sm.cabinetPlanItem}</li>
                  <li>{sm.cabinetHistoryItem}</li>
                </ul>
                <Link href="/dashboard" className="block mt-2">
                  <Button className="w-full h-9 rounded-full">
                    {sm.cabinetCta}
                  </Button>
                </Link>
              </div>
            </aside>

            {/* Canvas */}
            <section className="min-w-0 h-[82vh] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className={activeTab === "ai" ? "flex flex-col h-full min-h-0" : "hidden"}>
                {flags.chat && <AiConsultPanel locale={locale} />}
              </div>
              <div className={activeTab === "docs" ? "flex flex-col h-full min-h-0" : "hidden"}>
                {flags.review && (
                  <DocumentAnalysisPanel locale={locale} initialReviewId={initialReviewId} />
                )}
              </div>
              <div className={activeTab === "templates" ? "flex flex-col h-full min-h-0" : "hidden"}>
                {flags.generate && <TemplatesPanel sm={sm} />}
              </div>
              <div className={activeTab === "templatesFill" ? "flex flex-col h-full min-h-0" : "hidden"}>
                {flags.templates && <TemplatesLinkPanel sm={sm} />}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
