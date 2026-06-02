"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/validators";

export type UploadedFile = {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  resourceType: string;
};

type Props = {
  onUploaded?: (file: UploadedFile) => void;
  disabled?: boolean;
};

export function FileUpload({ onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type as never)) {
      toast.error("ფაილის ტიპი არ არის დაშვებული");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("ფაილი ძალიან დიდია. მაქსიმუმ 2MB.");
      return;
    }

    const body = new FormData();
    body.append("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "ატვირთვა ვერ მოხერხდა");
        return;
      }
      toast.success("ფაილი აიტვირთა");
      onUploaded?.(data as UploadedFile);
    } catch {
      toast.error("ქსელის შეცდომა");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_UPLOAD_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        aria-label="ფაილის ატვირთვა"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
