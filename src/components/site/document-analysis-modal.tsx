"use client";

import { useRef, useState } from "react";
import { FileUp, Image as ImageIcon, Loader2, Plus, Sparkles, AlertCircle, X as XIcon, Wand2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { RiskFindingCard } from "@/components/site/risk-finding-card";
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import type { RiskFinding } from "@/lib/legal/document-analysis";

const ACCEPT = ".pdf,.docx,.txt,.md";
const MAX_BYTES = 10 * 1024 * 1024;
const SUPPORTED = ["pdf", "docx", "txt", "md"];

const IMAGE_ACCEPT = ".jpg,.jpeg";
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_SUPPORTED = ["jpg", "jpeg"];

type AnalysisResult = {
  id: string;
  fileName: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
  skippedImages?: number;
};

type RevisionResult = {
  text: string;
  summary: string;
  findings: RiskFinding[];
  recommendations: string[];
  questions: string[];
  instruction: string;
  answers: Record<string, string>;
  createdAt: string;
};

type ImproveStatus = "idle" | "loading" | "error";

type Status = "idle" | "ready" | "analyzing" | "results" | "error";
type Mode = "document" | "photos";
type ImageItem = { file: File; url: string };

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function DocumentAnalysisPanel({ locale }: { locale: Locale }) {
  const t = getDict(locale).documentAnalysis;
  const [mode, setMode] = useState<Mode>("document");
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [errorKind, setErrorKind] = useState<
    "unsupported" | "tooLarge" | "unauthorized" | "quota" | "generic" | "unsupportedImage" | "noImages" | null
  >(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [revision, setRevision] = useState<RevisionResult | null>(null);
  const [instructionText, setInstructionText] = useState("");
  const [answersDraft, setAnswersDraft] = useState<Record<string, string>>({});
  const [improveStatus, setImproveStatus] = useState<ImproveStatus>("idle");
  const [improveErrorKind, setImproveErrorKind] = useState<
    "unauthorized" | "quota" | "generic" | null
  >(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  function clearImages() {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.url));
      return [];
    });
  }

  function reset() {
    setMode("document");
    setStatus("idle");
    setFile(null);
    clearImages();
    setErrorKind(null);
    setResult(null);
    setRevision(null);
    setInstructionText("");
    setAnswersDraft({});
    setImproveStatus("idle");
    setImproveErrorKind(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setFile(null);
    clearImages();
    setStatus("idle");
    setErrorKind(null);
    if (fileRef.current) fileRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
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

  function handleImagesPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    if (picked.some((f) => !IMAGE_SUPPORTED.includes(extOf(f.name)))) {
      setErrorKind("unsupportedImage");
      setStatus("error");
      return;
    }
    if (picked.some((f) => f.size > MAX_IMAGE_BYTES)) {
      setErrorKind("tooLarge");
      setStatus("error");
      return;
    }
    setImages((prev) => {
      const room = Math.max(MAX_IMAGES - prev.length, 0);
      const accepted = picked.slice(0, room).map((f) => ({ file: f, url: URL.createObjectURL(f) }));
      return [...prev, ...accepted];
    });
    setErrorKind(null);
    setStatus("ready");
    if (imagesRef.current) imagesRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStatus("idle");
      return next;
    });
  }

  async function analyze() {
    if (mode === "document" && !file) {
      setErrorKind("unsupported");
      setStatus("error");
      return;
    }
    if (mode === "photos" && images.length === 0) {
      setErrorKind("noImages");
      setStatus("error");
      return;
    }
    setStatus("analyzing");
    setErrorKind(null);
    try {
      const formData = new FormData();
      if (mode === "document" && file) {
        formData.append("file", file);
      } else {
        images.forEach((img) => formData.append("images", img.file));
      }
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

  async function improve(instructionOverride?: string, answersOverride?: Record<string, string>) {
    if (!result) return;
    setImproveStatus("loading");
    setImproveErrorKind(null);
    try {
      const res = await fetch("/api/review/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: result.id,
          instruction: instructionOverride ?? instructionText,
          answers: answersOverride ?? {},
        }),
      });
      if (res.status === 401) {
        setImproveErrorKind("unauthorized");
        setImproveStatus("error");
        return;
      }
      if (res.status === 403) {
        setImproveErrorKind("quota");
        setImproveStatus("error");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setImproveErrorKind("generic");
        setImproveStatus("error");
        return;
      }
      setRevision(data.revision as RevisionResult);
      setAnswersDraft({});
      setImproveStatus("idle");
    } catch {
      setImproveErrorKind("generic");
      setImproveStatus("error");
    }
  }

  function applyAnswers() {
    improve("", answersDraft);
  }

  function copyRevisedText() {
    if (!revision) return;
    navigator.clipboard.writeText(revision.text);
    toast.success(t.improveCopied);
  }

  const analyzeDisabled = mode === "document" ? !file : images.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {(status === "idle" || status === "ready") && (
          <div className="space-y-4">
            <div className="flex rounded-lg border border-border p-1 gap-1">
              <button
                type="button"
                onClick={() => switchMode("document")}
                className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  mode === "document"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.modeDocumentLabel}
              </button>
              <button
                type="button"
                onClick={() => switchMode("photos")}
                className={`flex-1 rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  mode === "photos"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.modePhotosLabel}
              </button>
            </div>

            {mode === "document" ? (
              <>
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
                <p className="text-xs text-muted-foreground text-center">
                  {t.pageCreditNotice}
                </p>
              </>
            ) : (
              <>
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, i) => (
                      <div
                        key={img.url}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => imagesRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                        aria-label={t.addMoreLabel}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => imagesRef.current?.click()}
                    className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition-colors p-8 flex flex-col items-center gap-2 text-center"
                  >
                    <ImageIcon className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium text-foreground">{t.dropzoneHintPhotos}</p>
                    <span className="text-xs text-muted-foreground">{t.chooseFile}</span>
                  </button>
                )}
                <input
                  ref={imagesRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={handleImagesPick}
                />
                {images.length >= MAX_IMAGES && (
                  <p className="text-xs text-muted-foreground text-center">{t.maxImagesNotice}</p>
                )}
              </>
            )}

            <Button onClick={analyze} disabled={analyzeDisabled} className="w-full">
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
                {errorKind === "unsupportedImage" && t.unsupportedImageTypeError}
                {errorKind === "noImages" && t.noImagesError}
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
            {(errorKind === "generic" ||
              errorKind === "unsupported" ||
              errorKind === "tooLarge" ||
              errorKind === "unsupportedImage" ||
              errorKind === "noImages") && (
              <Button variant="outline" className="w-full" onClick={reset}>
                {t.retryCta}
              </Button>
            )}
          </div>
        )}

        {status === "results" && result && (
          <div className="space-y-4">
            {typeof result.skippedImages === "number" && result.skippedImages > 0 && (
              <p className="text-xs rounded-lg border border-border bg-muted/50 p-2 text-muted-foreground">
                {t.skippedImagesNote} ({result.skippedImages})
              </p>
            )}

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

            <div className="space-y-3 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground">{t.improveTitle}</p>
              <Textarea
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                placeholder={t.improveInstructionPlaceholder}
                rows={3}
              />
              <Button
                onClick={() => improve()}
                disabled={improveStatus === "loading"}
                variant="outline"
                className="w-full"
              >
                {improveStatus === "loading" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                {improveStatus === "loading" ? t.improving : t.improveCta}
              </Button>

              {improveStatus === "error" && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    {improveErrorKind === "unauthorized" && t.loginRequired}
                    {improveErrorKind === "quota" && t.quotaExceeded}
                    {improveErrorKind === "generic" && t.genericError}
                  </span>
                </div>
              )}

              {revision && (
                <div className="space-y-4 rounded-lg border border-border p-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t.improveRevisedTitle}
                      </p>
                      <Button variant="ghost" size="sm" onClick={copyRevisedText}>
                        {t.improveCopyButton}
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                      {revision.text}
                    </pre>
                  </div>

                  {revision.findings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {t.improveFindingsLabel} ({revision.findings.length})
                      </p>
                      <div className="space-y-3">
                        {revision.findings.map((f, i) => (
                          <RiskFindingCard key={i} finding={f} locale={locale} />
                        ))}
                      </div>
                    </div>
                  )}

                  {revision.recommendations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        {t.improveRecommendationsLabel}
                      </p>
                      <ul className="space-y-1.5">
                        {revision.recommendations.map((r, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {revision.questions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {t.improveQuestionsTitle}
                      </p>
                      {revision.questions.map((q, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-sm">{q}</p>
                          <Textarea
                            value={answersDraft[q] ?? ""}
                            onChange={(e) =>
                              setAnswersDraft((prev) => ({ ...prev, [q]: e.target.value }))
                            }
                            placeholder={t.improveAnswerPlaceholder}
                            rows={2}
                          />
                        </div>
                      ))}
                      <Button
                        onClick={applyAnswers}
                        disabled={
                          improveStatus === "loading" ||
                          revision.questions.every((q) => !answersDraft[q]?.trim())
                        }
                        className="w-full"
                      >
                        {t.improveApplyAnswersCta}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={reset}>
              {t.chooseFile}
            </Button>
          </div>
        )}
      </div>
  );
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        {open && <DocumentAnalysisPanel locale={locale} />}
      </DialogContent>
    </Dialog>
  );
}
