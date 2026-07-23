"use client";

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Download, Copy, Pencil, Eye, Maximize2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { renderDocumentBody } from "@/lib/markdown-bold";
import { parseDocumentLegalBasis } from "@/lib/legal/citations";
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
import { getDict } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export type DocumentResult = { id: string; title: string; content: string; legalBasis?: string };

function normalizeSpacing(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * Result/preview/edit/export panel shared by the AI-generation page
 * (`/generate`) and the static-template page (`/templates`). Both flows save
 * their output as a `GeneratedDocument`, and `PATCH /api/generate/[id]` edits
 * either kind by id regardless of `source` — so this component doesn't need
 * to know which flow produced `result`.
 */
export function DocumentResultPanel({
  result,
  setResult,
  emptyHint,
  locale,
}: {
  result: DocumentResult | null;
  setResult: Dispatch<SetStateAction<DocumentResult | null>>;
  emptyHint: ReactNode;
  locale: Locale;
}) {
  const drp = getDict(locale).documentResultPanel;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = result ? result.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const pageCount = result ? estimatePageCount(result.content) : 0;

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast.success(drp.copiedToast);
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
        toast.error(drp.saveErrorToast);
      }
    } catch {
      toast.error(drp.saveErrorToast);
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(newContent: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(newContent), 1000);
  }

  if (!result) {
    return (
      <Card className="flex items-center justify-center min-h-[300px] border-dashed">
        <CardContent className="text-center text-muted-foreground text-sm py-12">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40 text-gold" />
          {emptyHint}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{result.title}</CardTitle>
              <CardDescription>
                {drp.savedMeta} · {wordCount} {drp.wordUnit} · ~{pageCount} {drp.pageUnit}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
                {editing ? (
                  <><Eye className="h-4 w-4 mr-1 text-gold" /> {drp.previewCta}</>
                ) : (
                  <><Pencil className="h-4 w-4 mr-1 text-gold" /> {drp.editCta}</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="h-4 w-4 mr-1 text-gold" /> {drp.copyCta}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1 text-gold" /> {drp.downloadCta}
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
                <Maximize2 className="h-4 w-4 mr-1 text-gold" /> {drp.fullScreenCta}
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
              {renderDocumentBody(normalizeSpacing(result.content))}
            </div>
          )}
          {saving && <p className="text-xs text-muted-foreground mt-2">{drp.savingNote}</p>}
        </CardContent>
      </Card>

      {result.legalBasis?.trim() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold" /> {drp.legalBasisTitle}
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

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>{result.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {renderDocumentBody(normalizeSpacing(result.content))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" /> {drp.downloadCta}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
