"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "./ImageUpload"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import type { AboutPageData } from "@/types/cms"
import { randomId } from "@/lib/uuid"

const EMPTY: AboutPageData = {
  title: "",
  intro: "",
  body: {},
  historyTitle: "",
  historyBody: "",
  missionTitle: "",
  mission: "",
  team: [],
  status: "draft",
}

export function AboutPageForm() {
  const [data, setData] = useState<AboutPageData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("/api/admin/cms/about").then((r) => r.json()).then(({ data: d }) => { if (d?._id) setData({ ...EMPTY, ...d }) })
  }, [])

  async function save(status: AboutPageData["status"]) {
    setSaving(true); setMsg("")
    await fetch("/api/admin/cms/about", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, status }),
    })
    setData((p) => ({ ...p, status })); setMsg("შენახულია"); setSaving(false)
  }

  function updateMember(i: number, patch: Partial<AboutPageData["team"][number]>) {
    setData((p) => { const team = [...p.team]; team[i] = { ...team[i], ...patch }; return { ...p, team } })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">ჩვენ შესახებ</h2>

      <div>
        <Label>სათაური</Label>
        <Input value={data.title} onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))} />
      </div>

      <div>
        <Label>შესავალი</Label>
        <p className="text-xs text-muted-foreground mb-1">პარაგრაფები გამოიყოთ ცარიელი სტრიქონით</p>
        <Textarea value={data.intro} rows={6} onChange={(e) => setData((p) => ({ ...p, intro: e.target.value }))} />
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <Label>ისტორიის სათაური</Label>
          <Input value={data.historyTitle} onChange={(e) => setData((p) => ({ ...p, historyTitle: e.target.value }))} />
        </div>
        <div>
          <Label>ისტორიის ტექსტი</Label>
          <p className="text-xs text-muted-foreground mb-1">პარაგრაფები გამოიყოთ ცარიელი სტრიქონით</p>
          <Textarea value={data.historyBody} rows={6} onChange={(e) => setData((p) => ({ ...p, historyBody: e.target.value }))} />
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <Label>მისიის სათაური</Label>
          <Input value={data.missionTitle} onChange={(e) => setData((p) => ({ ...p, missionTitle: e.target.value }))} />
        </div>
        <div>
          <Label>მისია</Label>
          <Textarea value={data.mission} rows={3} onChange={(e) => setData((p) => ({ ...p, mission: e.target.value }))} />
        </div>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">გუნდი</h3>
          <Button type="button" size="sm" variant="outline" onClick={() =>
            setData((p) => ({ ...p, team: [...p.team, { _id: randomId(), name: "", role: "", imageUrl: "", imagePubId: "", order: p.team.length }] }))
          }><Plus className="mr-1 h-3 w-3" /> Add</Button>
        </div>
        {data.team.map((m, i) => (
          <div key={m._id} className="flex gap-3 rounded border p-3">
            <ImageUpload label="" value={m.imageUrl} pubId={m.imagePubId}
              onUpload={(url, pubId) => updateMember(i, { imageUrl: url, imagePubId: pubId })} />
            <div className="flex-1 space-y-2">
              <Input placeholder="სახელი" value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} />
              <Input placeholder="თანამდებობა" value={m.role} onChange={(e) => updateMember(i, { role: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setData((p) => ({ ...p, team: p.team.filter((_, j) => j !== i) }))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </section>

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
