"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentDownloadButton({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  function download() {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={download} className="shrink-0">
      <Download className="h-4 w-4 mr-1" /> ჩამოტვირთვა
    </Button>
  );
}
