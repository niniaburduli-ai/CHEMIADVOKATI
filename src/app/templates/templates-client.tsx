"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Loader2 } from "lucide-react";
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
import { COMMON_FIELDS, QUESTION_SCHEMAS } from "@/lib/legal/document-fields";
import { DocumentResultPanel, type DocumentResult } from "@/components/site/DocumentResultPanel";

const TEMPLATE_DOC_TYPES = [
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

export function TemplatesClient({ initialType }: { initialType?: string } = {}) {
  const [type, setType] = useState(
    initialType && QUESTION_SCHEMAS[initialType] ? initialType : "rental-agreement"
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = [...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])];
  const missingRequired = fields.filter((f) => f.required && !answers[f.key]?.trim());

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function fill() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "შეცდომა");
        return;
      }
      setResult(data);
      toast.success("დოკუმენტი შეივსო");
    } catch {
      setError("სერვისთან კავშირი ვერ დამყარდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> მზა შაბლონები
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            შეავსე ველები — დოკუმენტი მზადდება მყისიერად, AI-ს გარეშე
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">შაბლონის ტიპი და დეტალები</CardTitle>
            <CardDescription>აირჩიე ტიპი და შეავსე მონაცემები</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-type">დოკუმენტის ტიპი</Label>
              <select
                id="template-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setAnswers({});
                  setResult(null);
                }}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TEMPLATE_DOC_TYPES.map((t) => (
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

            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                შესავსებია: {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={fill} disabled={loading || missingRequired.length > 0} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ივსება...
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

        <DocumentResultPanel
          key={result?.id ?? "empty"}
          result={result}
          setResult={setResult}
          emptyHint={<>შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი”</>}
        />
      </div>
    </div>
  );
}
