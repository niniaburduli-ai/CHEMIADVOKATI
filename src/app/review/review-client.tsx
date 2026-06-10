"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Upload,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type ReviewResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: string[];
  recommendations: string[];
};

export function ReviewClient() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(String(ev.target?.result ?? ""));
    };
    reader.readAsText(file, "utf-8");
  }

  async function review() {
    const content = text.trim();
    if (!content) {
      toast.error("ჩასვი ტექსტი ან ატვირთე ფაილი");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content, fileName: fileName || "document" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "შეცდომა");
        return;
      }
      setResult(data);
      toast.success("ანალიზი დასრულდა");
    } catch {
      setError("სერვისთან კავშირი ვერ დამყარდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-5 w-5" /> დოკუმენტის ანალიზი
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI ამოწმებს იურიდიულ პრობლემებს და იძლევა რეკომენდაციებს
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">ატვირთე ან ჩასვი ტექსტი</CardTitle>
          <CardDescription>
            ფაილი დამუშავების შემდეგ ავტომატურად იშლება — ინახება მხოლოდ შედეგი
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ფაილის ატვირთვა (.txt, .md)</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                {fileName || "აირჩიე ფაილი"}
              </Button>
              {fileName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFileName("");
                    setText("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  გასუფთავება
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.text"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="flex-1 border-t" />
              <span className="text-xs text-muted-foreground bg-background px-2">ან</span>
              <div className="flex-1 border-t" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="doc-text">ტექსტის ჩასმა</Label>
            <Textarea
              id="doc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ჩასვი დოკუმენტის ტექსტი აქ..."
              className="min-h-[160px]"
            />
            <p className="text-xs text-muted-foreground">{text.length} / 10 000 სიმბოლო</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={review} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ანალიზი მიმდინარეობს...
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                გააანალიზე
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ანალიზის შედეგი</CardTitle>
            <CardDescription>
              ფაილი წაიშალა — შედეგი შენახულია ანგარიშში
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">შეჯამება</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>

            {result.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  ნაპოვნი პრობლემები ({result.findings.length})
                </p>
                <ul className="space-y-1.5">
                  {result.findings.map((f, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  რეკომენდაციები ({result.recommendations.length})
                </p>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t">
              <Link
                href="/dashboard/reviews"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                ყველა ანალიზის ნახვა →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
