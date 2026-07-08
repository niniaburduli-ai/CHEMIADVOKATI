"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileText, Download, Copy, ArrowLeft, Loader2, Pencil, Eye, Maximize2, BookOpen, AlertTriangle } from "lucide-react";
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
import { parseDocumentLegalBasis } from "@/lib/legal/citations";
import { COMMON_FIELDS, QUESTION_SCHEMAS } from "@/lib/legal/document-fields";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportAsDocx, exportAsPdf } from "@/lib/export-document";
import { estimatePageCount } from "@/lib/page-count";

export const DOC_TYPES = [
  { value: "complaint", label: "საჩივარი" },
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "demand-letter", label: "სამართლებრივი მოთხოვნა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

function normalizeSpacing(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export function GenerateClient({ initialType }: { initialType?: string } = {}) {
  const [type, setType] = useState(
    initialType && QUESTION_SCHEMAS[initialType] ? initialType : "complaint"
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; title: string; content: string; legalBasis?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fields = [...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])];

  function buildDetails(): string {
    const lines = fields
      .map((f) => (answers[f.key]?.trim() ? `${f.label}: ${answers[f.key].trim()}` : null))
      .filter((line): line is string => line !== null);
    if (extra.trim()) lines.push(extra.trim());
    return lines.join("\n");
  }

  const details = buildDetails();
  const missingRequired = fields.filter((f) => f.required && !answers[f.key]?.trim());
  const wordCount = result ? result.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const pageCount = result ? estimatePageCount(result.content) : 0;

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
    setEditing(false);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
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

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast.success("კოპირებულია");
  }

  async function saveContent(newContent: string) {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/generate/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) {
        toast.error("ცვლილება ვერ შენახულა");
      }
    } catch {
      toast.error("ცვლილება ვერ შენახულა");
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(newContent: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(newContent), 1000);
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

      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-6 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>ხელშეკრულება შეინახება ისტორიაში 1 თვის ვადით, რის შემდეგაც ავტომატურად წაიშლება.</p>
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
                  setEditing(false);
                  if (saveTimerRef.current) {
                    clearTimeout(saveTimerRef.current);
                    saveTimerRef.current = null;
                  }
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

            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                შესავსებია: {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading || missingRequired.length > 0} className="w-full">
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{result.title}</CardTitle>
                    <CardDescription>
                      დოკუმენტი შეიქმნა და შენახულია ანგარიშში · {wordCount} სიტყვა · ~{pageCount} გვერდი
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
                      {editing ? (
                        <><Eye className="h-4 w-4 mr-1" /> მზა ტექსტი</>
                      ) : (
                        <><Pencil className="h-4 w-4 mr-1" /> რედაქტირება</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={copy}>
                      <Copy className="h-4 w-4 mr-1" /> კოპირება
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" /> ჩამოტვირთვა
                          </Button>
                        }
                      />
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => exportAsDocx(result.content, result.title)}>
                          Word (.docx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportAsPdf(result.content, result.title)}>
                          PDF (.pdf)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                      <Maximize2 className="h-4 w-4 mr-1" /> სრულ ეკრანზე
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <Textarea
                    value={result.content}
                    onChange={(e) => {
                      const next = e.target.value;
                      setResult((prev) => (prev ? { ...prev, content: next } : prev));
                      scheduleSave(next);
                    }}
                    onBlur={() => {
                      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                      saveContent(result.content);
                    }}
                    className="min-h-[70vh] font-mono text-sm"
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
                    {renderMarkdownBold(normalizeSpacing(result.content))}
                  </div>
                )}
                {saving && <p className="text-xs text-muted-foreground mt-2">ინახება...</p>}
              </CardContent>
            </Card>

            {result.legalBasis?.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> სამართლებრივი საფუძვლები და წყაროები
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parseDocumentLegalBasis(result.legalBasis).map((g, i) => (
                    <div key={`${g.lawName}|${i}`} className="space-y-1">
                      {g.lawName && <p className="text-sm font-medium">{g.lawName}</p>}
                      {g.articles.length > 0 && (
                        <ul className="ml-1 space-y-0.5">
                          {g.articles.map((a, j) => (
                            <li key={j} className="text-xs text-muted-foreground">
                              {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="flex items-center justify-center min-h-[300px] border-dashed">
            <CardContent className="text-center text-muted-foreground text-sm py-12">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი”
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-y-auto">
          {result && (
            <>
              <DialogHeader>
                <DialogTitle>{result.title}</DialogTitle>
              </DialogHeader>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderMarkdownBold(normalizeSpacing(result.content))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" /> ჩამოტვირთვა
                      </Button>
                    }
                  />
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportAsDocx(result.content, result.title)}>
                      Word (.docx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAsPdf(result.content, result.title)}>
                      PDF (.pdf)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
