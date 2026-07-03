"use client";

import { useState } from "react";
import { Send, Sparkles, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/site/file-upload";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { groupItemsByArticle } from "@/lib/legal/citations";
import { renderMarkdownBold } from "@/lib/markdown-bold";

type LegalBasisItem = {
  article: string;
  paragraph: string | null;
  subparagraph: string | null;
};

type LegalBasisGroup = {
  lawName: string;
  url: string;
  items: LegalBasisItem[];
};

type WebSource = { url: string; title: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  legalBasis?: LegalBasisGroup[];
  webSources?: WebSource[];
};

// Keep in sync with NOT_FOUND_MSG in src/lib/legal/openrouter.ts.
const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

export function ChatClient({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
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

      let webSources: WebSource[] = [];
      const rawWeb = res.headers.get("X-Web-Sources");
      if (rawWeb) {
        try {
          webSources = JSON.parse(decodeURIComponent(rawWeb));
        } catch {
          webSources = [];
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
        webSources: isNotFound ? [] : webSources,
      }));
    } catch {
      patch((msg) => ({
        ...msg,
        content: d.chat.errorNetwork,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <section className="bg-slate-900">
        <div className="container mx-auto px-4 py-16 max-w-3xl">
          <p className="animate-fade-up leading-tight">
            <span className="block text-5xl md:text-6xl font-bold text-white leading-tight mb-3">{d.chat.greeting.split(" — ")[0]}</span>
            <br />
            <span className="text-2xl font-semibold text-gold whitespace-nowrap">{d.chat.greeting.split(" — ").slice(1).join(" — ")}</span>
          </p>
        </div>
      </section>
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <p className="text-sm text-muted-foreground mb-6 animate-fade-up">{d.chat.intro1}</p>

      <div className="space-y-4 mb-6">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-3">
            <div className="shrink-0 mt-1">
              {m.role === "user" ? (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
            </div>
            <Card className={["flex-1", m.role === "assistant" ? "border-t-[3px] border-t-primary" : ""].filter(Boolean).join(" ")}>
              <CardContent className="py-3">
                {m.content ? (
                  <p className="text-sm whitespace-pre-wrap">{renderMarkdownBold(m.content)}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{d.chat.writing}</p>
                )}
                {m.legalBasis && m.legalBasis.length > 0 && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {d.chat.legalBasis}
                    </p>
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
                            className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                          >
                            <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{d.chat.source}</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.webSources && m.webSources.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {d.chat.webSources}
                    </p>
                    <ul className="space-y-0.5">
                      {m.webSources.map((s) => (
                        <li key={s.url}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-xs text-primary hover:underline break-all"
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <form
        className="sticky bottom-4 flex flex-col gap-2 bg-background/95 backdrop-blur-sm rounded-2xl border border-border p-3 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {messages.length === 0 && (
          <label className="text-sm font-semibold text-primary">
            {d.chat.howCanIHelp}
          </label>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={d.chat.placeholder}
            className="min-h-[60px] bg-background"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <FileUpload
            disabled={loading}
            onUploaded={(f) =>
              setInput((prev) =>
                prev ? `${prev}\n${f.url}` : f.url
              )
            }
          />
          <Button type="submit" size="icon" disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-3">
        {d.chat.disclaimer}
      </p>
    </div>
    </div>
  );
}
