"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import type { FooterColumn, FooterData } from "@/types/cms"
import type { Locale } from "@/lib/i18n/config"
import { randomId } from "@/lib/uuid"

const EMPTY: FooterData = { columns: [], disclaimer: "", copyright: "", status: "draft" }

function newCol(order: number): FooterColumn {
  return { _id: randomId(), heading: "", links: [], order }
}

export function FooterForm({ locale = "ka" }: { locale?: Locale }) {
  const [data, setData] = useState<FooterData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      const r = await fetch(`/api/admin/cms/footer?locale=${locale}`)
      const { data: d } = await r.json()
      if (active) setData(d ? { ...EMPTY, ...d } : EMPTY)
    })()
    return () => { active = false }
  }, [locale])

  function updateCol(ci: number, patch: Partial<FooterColumn>) {
    setData((p) => { const cols = [...p.columns]; cols[ci] = { ...cols[ci], ...patch }; return { ...p, columns: cols } })
  }

  function addLink(ci: number) {
    setData((p) => {
      const cols = [...p.columns]
      cols[ci] = { ...cols[ci], links: [...cols[ci].links, { label: "", href: "" }] }
      return { ...p, columns: cols }
    })
  }

  function updateLink(ci: number, li: number, patch: { label?: string; href?: string }) {
    setData((p) => {
      const cols = [...p.columns]
      const links = [...cols[ci].links]
      links[li] = { ...links[li], ...patch }
      cols[ci] = { ...cols[ci], links }
      return { ...p, columns: cols }
    })
  }

  function removeLink(ci: number, li: number) {
    setData((p) => {
      const cols = [...p.columns]
      cols[ci] = { ...cols[ci], links: cols[ci].links.filter((_, j) => j !== li) }
      return { ...p, columns: cols }
    })
  }

  async function save(status: FooterData["status"]) {
    setSaving(true); setMsg("")
    await fetch(`/api/admin/cms/footer?locale=${locale}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, status }),
    })
    setData((p) => ({ ...p, status })); setMsg("შენახულია"); setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">ქვედა კოლონტიტული (Footer)</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">სვეტები</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setData((p) => ({ ...p, columns: [...p.columns, newCol(p.columns.length)] }))}>
            <Plus className="mr-1 h-3 w-3" /> სვეტის დამატება
          </Button>
        </div>
        {data.columns.map((col, ci) => (
          <div key={col._id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label>სათაური</Label>
                <Input value={col.heading} onChange={(e) => updateCol(ci, { heading: e.target.value })} />
              </div>
              <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => setData((p) => ({ ...p, columns: p.columns.filter((_, i) => i !== ci) }))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              {col.links.map((lnk, li) => (
                <div key={li} className="flex gap-2">
                  <Input placeholder="Label" value={lnk.label} onChange={(e) => updateLink(ci, li, { label: e.target.value })} />
                  <Input placeholder="URL" value={lnk.href} onChange={(e) => updateLink(ci, li, { href: e.target.value })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLink(ci, li)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addLink(ci)}>
                <Plus className="mr-1 h-3 w-3" /> ლინკი
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Disclaimer</Label>
        <Textarea value={data.disclaimer} rows={3} onChange={(e) => setData((p) => ({ ...p, disclaimer: e.target.value }))} />
      </div>
      <div>
        <Label>Copyright</Label>
        <Input value={data.copyright} onChange={(e) => setData((p) => ({ ...p, copyright: e.target.value }))} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => save("draft")} disabled={saving} variant="outline">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Draft
        </Button>
        <Button onClick={() => save("published")} disabled={saving}>გამოქვეყნება</Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium bg-muted">{data.status}</span>
      </div>
    </div>
  )
}
