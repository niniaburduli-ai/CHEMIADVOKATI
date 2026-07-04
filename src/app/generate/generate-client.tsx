"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, Copy, ArrowLeft, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { renderMarkdownBold } from "@/lib/markdown-bold";

const DOC_TYPES = [
  { value: "complaint", label: "საჩივარი" },
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "demand-letter", label: "სამართლებრივი მოთხოვნა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

type FieldType = "text" | "textarea" | "date";
type QuestionField = { key: string; label: string; type: FieldType };

const QUESTION_SCHEMAS: Record<string, QuestionField[]> = {
  complaint: [
    { key: "respondent", label: "ვის ეხება საჩივარი", type: "text" },
    { key: "yourName", label: "შენი სახელი და გვარი", type: "text" },
    { key: "amount", label: "თანხა/ზიანი (ასეთის არსებობისას)", type: "text" },
    { key: "incidentDate", label: "მოვლენის თარიღი", type: "date" },
  ],
  "rental-agreement": [
    { key: "landlord", label: "გამქირავებელი", type: "text" },
    { key: "tenant", label: "დამქირავებელი", type: "text" },
    { key: "address", label: "ბინის მისამართი", type: "text" },
    { key: "rent", label: "ქირის ოდენობა", type: "text" },
    { key: "duration", label: "ხელშეკრულების ვადა", type: "text" },
  ],
  "employment-contract": [
    { key: "employer", label: "დამსაქმებელი", type: "text" },
    { key: "employee", label: "თანამშრომელი", type: "text" },
    { key: "position", label: "პოზიცია", type: "text" },
    { key: "salary", label: "ხელფასი", type: "text" },
    { key: "startDate", label: "დაწყების თარიღი", type: "date" },
  ],
  "power-of-attorney": [
    { key: "principal", label: "მინდობელი", type: "text" },
    { key: "agent", label: "მინდობილი პირი", type: "text" },
    { key: "scope", label: "მინდობის ფარგლები", type: "textarea" },
    { key: "idNumber", label: "პირადი ნომერი", type: "text" },
  ],
  "demand-letter": [
    { key: "recipient", label: "ადრესატი", type: "text" },
    { key: "amount", label: "მოთხოვნილი თანხა", type: "text" },
    { key: "reason", label: "მოთხოვნის საფუძველი", type: "textarea" },
    { key: "deadline", label: "ვადა", type: "text" },
  ],
  "termination-notice": [
    { key: "employer", label: "დამსაქმებელი", type: "text" },
    { key: "employee", label: "თანამშრომელი", type: "text" },
    { key: "reason", label: "საფუძველი", type: "text" },
    { key: "lastDay", label: "ბოლო სამუშაო დღე", type: "date" },
  ],
};

function normalizeSpacing(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export function GenerateClient() {
  const [type, setType] = useState("complaint");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = QUESTION_SCHEMAS[type] ?? [];

  function buildDetails(): string {
    const lines = fields
      .map((f) => (answers[f.key]?.trim() ? `${f.label}: ${answers[f.key].trim()}` : null))
      .filter((line): line is string => line !== null);
    if (extra.trim()) lines.push(extra.trim());
    return lines.join("\n");
  }

  const details = buildDetails();
  const wordCount = result ? result.content.trim().split(/\s+/).filter(Boolean).length : 0;

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function generate() {
    if (details.trim().length < 10) {
      toast.error("შეავსე მინიმუმ ერთი ველი დეტალური ინფორმაციით");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "შეცდომა");
        return;
      }
      setResult(data);
      toast.success("დოკუმენტი შეიქმნა");
    } catch {
      setError("სერვისთან კავშირი ვერ დამყარდა");
    } finally {
      setLoading(false);
    }
  }

  function downloadTxt() {
    if (!result) return;
    const blob = new Blob([result.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast.success("კოპირებულია");
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> დოკუმენტის გენერაცია
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI ქმნის სრულ ქართულ იურიდიულ დოკუმენტს
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">დოკუმენტის ტიპი და დეტალები</CardTitle>
            <CardDescription>
              აირჩიე ტიპი და შეავსე ცნობილი დეტალები
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">დოკუმენტის ტიპი</Label>
              <select
                id="doc-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setAnswers({});
                  setExtra("");
                  setResult(null);
                }}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={`field-${f.key}`}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    type={f.type}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="extra">დამატებითი დეტალები</Label>
              <Textarea
                id="extra"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="დაამატე ნებისმიერი სხვა მნიშვნელოვანი დეტალი"
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">{details.length} / 2000 სიმბოლო</p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  იქმნება...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  შექმენი დოკუმენტი
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">{result.title}</CardTitle>
                  <CardDescription>
                    დოკუმენტი შეიქმნა და შენახულია ანგარიშში · {wordCount} სიტყვა
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copy}>
                    <Copy className="h-4 w-4 mr-1" /> კოპირება
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-1" /> .txt
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                {renderMarkdownBold(normalizeSpacing(result.content))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px] border-dashed">
            <CardContent className="text-center text-muted-foreground text-sm py-12">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი”
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
