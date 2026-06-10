"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Download, Copy, ArrowLeft, Loader2 } from "lucide-react";
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

const DOC_TYPES = [
  { value: "complaint", label: "საჩივარი" },
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "demand-letter", label: "სამართლებრივი მოთხოვნა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

const PLACEHOLDER: Record<string, string> = {
  complaint: "მაგ: ვმოსჩივი ბანკს, რომელმაც 1000 ლარი ჩამომაჭრა. ბანკი: TBC. ჩემი სახელი: გიორგი ბერიძე.",
  "rental-agreement": "მაგ: ვაქირავებ ბინას: 2 ოთახი, თბილისი, ვაკე. ქირა: 800 ლ/თვე. 12 თვიანი ხელშეკრულება.",
  "employment-contract": "მაგ: პოზიცია: პროგრამისტი. კომპანია: ABC LLC. ხელფასი: 3000 ლ. სამუშაო: 9-18, ორშ-პარ.",
  "power-of-attorney": "მაგ: ვანდობ ავტომობილის გაყიდვის უფლებას. მინდობილი: ნინო ახვლედიანი, პ/ნ 123.",
  "demand-letter": "მაგ: ვითხოვ 2000 ლარის დაბრუნებას კონტრაქტის შეუსრულებლობის გამო. ვადა: 10 სამუშაო დღე.",
  "termination-notice": "მაგ: ვათავისუფლებ თანამშრომელს შტატების შემცირების გამო. ბოლო სამუშაო დღე: 2026-07-01.",
};

export function GenerateClient() {
  const [type, setType] = useState("complaint");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!details.trim()) {
      toast.error("შეიყვანე დოკუმენტის დეტალები");
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
    <div className="container mx-auto px-4 py-10 max-w-2xl">
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">დოკუმენტის ტიპი და დეტალები</CardTitle>
          <CardDescription>
            აირჩიე ტიპი და აღწერე, ვინ არიან მხარეები, რა სიტუაციაა
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
                setDetails("");
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

          <div className="space-y-2">
            <Label htmlFor="details">დეტალები</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={PLACEHOLDER[type]}
              className="min-h-[120px]"
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

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">{result.title}</CardTitle>
                <CardDescription>
                  დოკუმენტი შეიქმნა და შენახულია ანგარიშში
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
            <pre className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[480px] overflow-y-auto">
              {result.content}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
