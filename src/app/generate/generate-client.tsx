"use client";

import { useState } from "react";
import { FileText, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubPageHeader } from "@/components/site/SubPageHeader";
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
import { COMMON_FIELDS, QUESTION_SCHEMAS, fieldLabel } from "@/lib/legal/document-fields";
import { docTypeLabel } from "@/lib/legal/doc-type-labels";
import { DocumentResultPanel, type DocumentResult } from "@/components/site/DocumentResultPanel";
import { UpgradeRequiredDialog } from "@/components/site/upgrade-required-dialog";
import { ChatStreamReader } from "@/lib/streaming/chat-protocol";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export const DOC_TYPE_VALUES = ["complaint", "demand-letter"] as const;

export function getDocTypes(locale: Locale) {
  return DOC_TYPE_VALUES.map((value) => ({ value, label: docTypeLabel(value, locale) }));
}

export function GenerateClient({
  initialType,
  locale,
}: {
  initialType?: string;
  locale: Locale;
}) {
  const d = getDict(locale);
  const gp = d.generatePage;
  const DOC_TYPES = getDocTypes(locale);

  const [type, setType] = useState(
    initialType && QUESTION_SCHEMAS[initialType] ? initialType : "complaint"
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const fields = [...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])];

  function buildDetails(): string {
    const lines = fields
      .map((f) =>
        answers[f.key]?.trim() ? `${fieldLabel(f, locale)}: ${answers[f.key].trim()}` : null
      )
      .filter((line): line is string => line !== null);
    if (extra.trim()) lines.push(extra.trim());
    return lines.join("\n");
  }

  const details = buildDetails();
  const missingRequired = fields.filter((f) => f.required && !answers[f.key]?.trim());

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function generate() {
    if (details.trim().length < 10) {
      toast.error(gp.minLengthError);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setStreamingText("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, details, locale }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          setQuotaExceeded(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? gp.genericError);
        return;
      }

      if (!res.body) {
        setError(gp.connectionError);
        return;
      }

      // Prose streams live for immediate feedback; the trailing in-band meta
      // payload carries the authoritative final content (id/title/legalBasis,
      // and a server-validated copy of the text) once generation finishes —
      // see ChatStreamReader for why headers can't carry this instead.
      type GenerateMeta = {
        id?: string;
        title?: string;
        content?: string;
        legalBasis?: string;
        error?: string;
      };
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const streamReader = new ChatStreamReader();
      let meta: GenerateMeta | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const ev of streamReader.push(decoder.decode(value, { stream: true }))) {
          if (ev.type === "prose") setStreamingText((t) => t + ev.text);
          else if (ev.type === "meta") meta = ev.data as GenerateMeta;
        }
      }
      for (const ev of streamReader.finish()) {
        if (ev.type === "meta") meta = ev.data as GenerateMeta;
      }

      if (!meta || meta.error) {
        setError(meta?.error ?? gp.genericError);
        return;
      }
      setResult({
        id: meta.id!,
        title: meta.title!,
        content: meta.content!,
        legalBasis: meta.legalBasis,
      });
      toast.success(gp.successToast);
    } catch {
      setError(gp.connectionError);
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <SubPageHeader
        backHref="/dashboard"
        icon={<FileText className="h-5 w-5 text-gold" />}
        title={gp.pageTitle}
        subtitle={gp.pageSubtitle}
      />

      <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 mb-6 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <p>{gp.retentionNotice}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[460px_1fr] items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{gp.cardTitle}</CardTitle>
            <CardDescription>{gp.cardSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[8rem_1fr] gap-3 items-center">
              <Label htmlFor="doc-type">{gp.docTypeLabel}</Label>
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
              <div key={f.key} className="grid grid-cols-[8rem_1fr] gap-3 items-start">
                <Label htmlFor={`field-${f.key}`} className="pt-2">{fieldLabel(f, locale)}</Label>
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

            <div className="grid grid-cols-[8rem_1fr] gap-3 items-start">
              <Label htmlFor="extra" className="pt-2">{gp.extraLabel}</Label>
              <div className="space-y-1">
                <Textarea
                  id="extra"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={gp.extraPlaceholder}
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">{details.length} / 2000 {gp.charCountSuffix}</p>
              </div>
            </div>

            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {gp.missingRequiredPrefix} {missingRequired.map((f) => fieldLabel(f, locale)).join(", ")}
              </p>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button onClick={generate} disabled={loading || missingRequired.length > 0} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {gp.generating}
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  {gp.generateCta}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="min-h-[300px]">
            <CardContent className="py-6">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                {streamingText || (
                  <span className="text-muted-foreground">{gp.streamingPlaceholder}</span>
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <DocumentResultPanel
            key={result?.id ?? 'empty'}
            result={result}
            setResult={setResult}
            emptyHint={<>{gp.resultEmptyHint}</>}
            locale={locale}
          />
        )}
      </div>
      <UpgradeRequiredDialog open={quotaExceeded} onOpenChange={setQuotaExceeded} strings={d.quota} />
    </div>
  );
}
