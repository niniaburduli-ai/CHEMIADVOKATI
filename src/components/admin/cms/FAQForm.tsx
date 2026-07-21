"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Save, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FAQItem } from "@/types/cms"
import { randomId } from "@/lib/uuid"

function newItem(order: number): FAQItem {
  return { _id: randomId(), question: "", answer: "", category: "", order, status: "draft" }
}

export function FAQForm() {
  const [items, setItems] = useState<FAQItem[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/cms/faq").then((r) => r.json()).then(({ data }) => { if (data?.items) setItems(data.items) })
  }, [])

  function update(i: number, patch: Partial<FAQItem>) {
    setItems((p) => p.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  }

  async function save() {
    setSaving(true); setMsg("")
    await fetch("/api/admin/cms/faq", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((it, i) => ({ ...it, order: i })) }),
    })
    setMsg("შენახულია"); setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">კითხვა-პასუხი (FAQ)</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item._id} className="rounded-lg border">
            <button
              type="button"
              className="flex w-full items-center justify-between p-3 text-left"
              onClick={() => setOpen(open === item._id ? null : item._id)}
            >
              <span className="truncate text-sm font-medium">{item.question || `კითხვა ${i + 1}`}</span>
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-xs", item.status === "published" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground")}>
                  {item.status}
                </span>
                {open === item._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>
            {open === item._id && (
              <div className="space-y-3 border-t p-3">
                <div>
                  <Label>კითხვა</Label>
                  <Input value={item.question} onChange={(e) => update(i, { question: e.target.value })} />
                </div>
                <div>
                  <Label>პასუხი</Label>
                  <Textarea value={item.answer} rows={4} onChange={(e) => update(i, { answer: e.target.value })} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label>კატეგორია</Label>
                    <Input value={item.category} onChange={(e) => update(i, { category: e.target.value })} />
                  </div>
                  <div>
                    <Label>სტატუსი</Label>
                    <select
                      value={item.status}
                      onChange={(e) => update(i, { status: e.target.value as FAQItem["status"] })}
                      className="mt-1 block rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="draft">draft</option>
                      <option value="published">published</option>
                      <option value="hidden">hidden</option>
                    </select>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => setItems((p) => p.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, newItem(p.length)])}>
        <Plus className="mr-2 h-4 w-4" /> კითხვის დამატება
      </Button>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          შენახვა
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </div>
  )
}
