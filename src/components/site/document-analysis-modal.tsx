"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Sparkles, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiskFindingCard } from "@/components/site/risk-finding-card";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { RiskFinding } from "@/lib/legal/document-analysis";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 10 * 1024 * 1024;
const SUPPORTED = ["pdf", "docx", "txt", "md"];

type AnalysisResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
};

type Status = "idle" | "ready" | "analyzing" | "results" | "error";

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function DocumentAnalysisModal({
  open,
  onOpenChange,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}) {
  const t = getDict(locale).documentAnalysis;
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [errorKind, setErrorKind] = useState<
    "unsupported" | "tooLarge" | "unauthorized" | "quota" | "generic" | null
  >(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStatus("idle");
    setFile(null);
    setErrorKind(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!SUPPORTED.includes(extOf(picked.name))) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setErrorKind("tooLarge");
      setStatus("error");
      return;
    }
    setFile(picked);
    setErrorKind(null);
    setStatus("ready");
  }

  async function analyze() {
    if (!file) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    setErrorKind(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/review", { method: "POST", body: formData });
      if (res.status === 401) {
        setErrorKind("unauthorized");
        setStatus("error");
        return;
      }
      if (res.status === 403) {
        setErrorKind("quota");
        setStatus("error");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErrorKind("generic");
        setStatus("error");
        return;
      }
      setResult(data as AnalysisResult);
      setStatus("results");
    } catch {
      setErrorKind("generic");
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>

        {(status === "idle" || status === "ready") && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center gap-2 text-center"
            >
              <FileUp className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : t.dropzoneHint}
              </p>
              <span className="text-xs text-muted-foreground">
                {file ? t.changeFile : t.chooseFile}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handlePick}
            />
            <Button onClick={analyze} disabled={!file} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              {t.analyzeCta}
            </Button>
          </div>
        )}

        {status === "analyzing" && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t.analyzing}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {errorKind === "unsupported" && t.unsupportedTypeError}
                {errorKind === "tooLarge" && t.tooLargeError}
                {errorKind === "unauthorized" && t.loginRequired}
                {errorKind === "quota" && t.quotaExceeded}
                {errorKind === "generic" && t.genericError}
              </span>
            </div>
            {errorKind === "unauthorized" && (
              <a href="/login" className="block">
                <Button className="w-full">{t.loginCta}</Button>
              </a>
            )}
            {errorKind === "quota" && (
              <a href="/pricing" className="block">
                <Button className="w-full">{t.upgradeCta}</Button>
              </a>
            )}
            {(errorKind === "generic" || errorKind === "unsupported" || errorKind === "tooLarge") && (
              <Button variant="outline" className="w-full" onClick={reset}>
                {t.retryCta}
              </Button>
            )}
          </div>
        )}

        {status === "results" && result && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{t.summaryLabel}</p>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>

            {result.findings.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t.findingsLabel} ({result.findings.length})
                </p>
                <div className="space-y-3">
                  {result.findings.map((f, i) => (
                    <RiskFindingCard key={i} finding={f} locale={locale} />
                  ))}
                </div>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  {t.recommendationsLabel}
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

            <p className="text-xs text-muted-foreground pt-2 border-t">{t.resultsSavedNote}</p>
            <Button variant="outline" className="w-full" onClick={reset}>
              {t.chooseFile}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
