"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, X } from "lucide-react"

interface Props {
  value: string
  pubId: string
  onUpload: (url: string, pubId: string) => void
  onDelete?: () => void
  label?: string
}

export function ImageUpload({ value, pubId, onUpload, onDelete, label = "Image" }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    setLoading(true)
    try {
      if (pubId) {
        await fetch("/api/admin/cms/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: pubId }),
        })
      }
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()
      if (data.url) onUpload(data.url, data.publicId)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!pubId) return
    setLoading(true)
    try {
      await fetch("/api/admin/cms/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId: pubId }),
      })
      onDelete?.()
      onUpload("", "")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-20 w-auto rounded border object-contain" />
          <button
            type="button"
            onClick={handleDelete}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => ref.current?.click()}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {value ? "Replace" : "Upload"}
      </Button>
    </div>
  )
}
