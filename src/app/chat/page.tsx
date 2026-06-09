"use client";

import { useState } from "react";
import { Send, Sparkles, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/site/file-upload";

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

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  legalBasis?: LegalBasisGroup[];
};

// Keep in sync with NOT_FOUND_MSG in src/lib/legal/openrouter.ts. When the model
// can't answer from the approved text we must not show citations beside it.
const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

/** "მუხლი 37, პუნქტი 2, ქვეპუნქტი „ა“" from a single citation item. */
function formatItem(it: LegalBasisItem): string {
  let s = it.article;
  if (it.paragraph) s += `, პუნქტი ${it.paragraph}`;
  if (it.subparagraph) s += `, ქვეპუნქტი „${it.subparagraph}“`;
  return s;
}

const sampleQuestions = [
  "როგორ გავხსნა ინდმეწარმე?",
  "შრომის კოდექსით რამდენი დასვენების დღე მეკუთვნის?",
  "ბინის ქირაში გადახდილი თანხის დაბრუნება შემიძლია?",
  "ალიმენტი როგორ გამოითვლება?",
];

export default function ChatPage() {
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

      // No-match / error path returns JSON { answer, sources }.
      if (ct.includes("application/json")) {
        const data = await res.json();
        const content = data.answer ?? data.error ?? "შეცდომა.";
        patch((msg) => ({
          ...msg,
          content,
          legalBasis: content.trim() === NOT_FOUND_MSG ? [] : data.legalBasis ?? [],
        }));
        return;
      }

      // Streaming path: text/plain body + legal basis in header.
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
        patch((msg) => ({ ...msg, content: "შეცდომა — პასუხი ვერ მივიღე.", legalBasis }));
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
      // A not-found answer has no real citations.
      patch((msg) => ({
        ...msg,
        content: acc,
        legalBasis: acc.trim() === NOT_FOUND_MSG ? [] : legalBasis,
      }));
    } catch {
      patch((msg) => ({
        ...msg,
        content: "შეცდომა — სერვისთან კავშირი ვერ დამყარდა.",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> AI იურისტი
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          ჰკითხე ნებისმიერი იურიდიული საკითხი. პასუხი — მარტივი ენით.
        </p>
      </div>

      {messages.length === 0 && (
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-3">სცადე ეს:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-left p-3 rounded-lg border hover:bg-muted/50 text-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

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
            <Card className="flex-1">
              <CardContent className="py-3">
                {m.content ? (
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">წერს...</p>
                )}
                {m.legalBasis && m.legalBasis.length > 0 && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      იურიდიული საფუძველი:
                    </p>
                    {m.legalBasis.map((g) => (
                      <div key={g.url} className="space-y-1">
                        <p className="text-xs font-medium">{g.lawName}:</p>
                        <ul className="ml-1 space-y-0.5">
                          {g.items.map((it, i) => (
                            <li
                              key={`${it.article}-${it.paragraph ?? ""}-${it.subparagraph ?? ""}-${i}`}
                              className="text-xs text-muted-foreground"
                            >
                              {formatItem(it)}
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
                          <span>წყარო</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      <form
        className="sticky bottom-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="დაწერე შენი შეკითხვა..."
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
      </form>
      <p className="text-xs text-muted-foreground text-center mt-3">
        AI-ის პასუხები არ ცვლის კვალიფიციური ადვოკატის რჩევას.
      </p>
    </div>
  );
}
