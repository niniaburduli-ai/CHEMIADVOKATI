"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Save, Trash2, GripVertical } from "lucide-react"
import type { NavItem, NavMenuData } from "@/types/cms"
import type { Locale } from "@/lib/i18n/config"

function newItem(order: number): NavItem {
  return { _id: crypto.randomUUID(), label: "", href: "", order, isExternal: false }
}

export function NavMenuForm({ locale = "ka" }: { locale?: Locale }) {
  const [items, setItems] = useState<NavItem[]>([])
  const [status, setStatus] = useState<"draft" | "published">("draft")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [drag, setDrag] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const r = await fetch(`/api/admin/cms/nav?locale=${locale}`)
      const { data }: { data: NavMenuData } = await r.json()
      if (!active) return
      setItems(data?.items ?? [])
      setStatus((data?.status as "draft" | "published") ?? "draft")
    })()
    return () => { active = false }
  }, [locale])

  function updateItem(idx: number, patch: Partial<NavItem>) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx).map((it, i) => ({ ...it, order: i })))
  }

  function addItem() {
    setItems((p) => [...p, newItem(p.length)])
  }

  async function save(newStatus?: "draft" | "published") {
    setSaving(true); setMsg("")
    const s = newStatus ?? status
    await fetch(`/api/admin/cms/nav?locale=${locale}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((it, i) => ({ ...it, order: i })), status: s }),
    })
    setStatus(s); setMsg("შენახულია"); setSaving(false)
  }

  function onDragStart(idx: number) { setDrag(idx) }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (drag === null || drag === idx) return
    const next = [...items]
    const [moved] = next.splice(drag, 1)
    next.splice(idx, 0, moved)
    setItems(next); setDrag(idx)
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">ნავიგაცია</h2>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item._id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDragEnd={() => setDrag(null)}
            className="flex items-center gap-2 rounded-md border bg-background p-2"
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
            <div className="grid flex-1 grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Label (Georgian)</Label>
                <Input value={item.label} onChange={(e) => updateItem(idx, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">URL / Path</Label>
                <Input value={item.href} onChange={(e) => updateItem(idx, { href: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={item.isExternal} onChange={(e) => updateItem(idx, { isExternal: e.target.checked })} />
              External
            </label>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" /> ლინკის დამატება
      </Button>
      <div className="flex items-center gap-3">
        <Button onClick={() => save("draft")} disabled={saving} variant="outline">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Draft-ად შენახვა
        </Button>
        <Button onClick={() => save("published")} disabled={saving}>
          გამოქვეყნება
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium bg-muted">{status}</span>
      </div>
    </div>
  )
}
