"use client";

import { useState } from "react";
import { Send, Sparkles, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/site/file-upload";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; ref: string }[];
};

const sampleQuestions = [
  "როგორ გავხსნა ინდმეწარმე?",
  "შრომის კოდექსით რამდენი დასვენების დღე მეკუთვნის?",
  "ბინის ქირაში გადახდილი თანხის დაბრუნება შემიძლია?",
  "ალიმენტი როგორ გამოითვლება?",
];

const mockReply = (q: string): Message => ({
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    `მოკლე პასუხი: ${q.slice(0, 40)}... — ეს დემო პასუხია. რეალურ ვერსიაში ` +
    `AI იურისტი დაგეხმარება ქართული კანონმდებლობის საფუძველზე, მარტივი ` +
    `ენით ახსნით. გადახედე ციტირებულ მუხლებს ქვემოთ.`,
  sources: [
    { title: "სამოქალაქო კოდექსი", ref: "მუხლი 286" },
    { title: "შრომის კოდექსი", ref: "მუხლი 47" },
  ],
});

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages((m) => [...m, mockReply(text)]);
      setLoading(false);
    }, 900);
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
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                {m.sources && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.sources.map((s) => (
                      <Badge
                        key={s.ref}
                        variant="secondary"
                        className="text-xs"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {s.title} — {s.ref}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        {loading && (
          <div className="text-sm text-muted-foreground pl-11">წერს...</div>
        )}
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
