"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Plan = {
  id: string
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  currency: string
  period: string
  consultations: number
  docGeneration: number
  docReview: number
  features: string[]
  featuresEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
}

const BLANK: Plan = {
  id: "", key: "", name: "", nameEn: "", description: "", descriptionEn: "",
  priceMinor: 0, currency: "GEL", period: "month",
  consultations: 0, docGeneration: 0, docReview: 0,
  features: [], featuresEn: [], isFree: false, highlighted: false, visible: true, active: true, order: 0,
}

function gel(minor: number): string {
  return (minor / 100).toLocaleString("ka-GE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PlansPanel() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    const res = await fetch("/api/admin/plans")
    const { data } = await res.json()
    setPlans(data ?? [])
    setLoading(false)
  }
  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch("/api/admin/plans")
      const { data } = await res.json()
      if (active) {
        setPlans(data ?? [])
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function remove(p: Plan) {
    if (!confirm(`წავშალო გეგმა "${p.name}"?`)) return
    setBusyId(p.id)
    try {
      const res = await fetch(`/api/admin/plans/${p.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "წაშლა ვერ მოხერხდა")
        return
      }
      toast.success("გეგმა წაიშალა")
      setPlans((prev) => prev.filter((x) => x.id !== p.id))
    } catch {
      toast.error("ქსელის შეცდომა")
    } finally {
      setBusyId(null)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება…
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">გეგმები და ფასები</h2>
        <Button size="sm" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="mr-2 h-4 w-4" /> ახალი გეგმა
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
              <th>გეგმა</th>
              <th>Key</th>
              <th>ფასი</th>
              <th>კონს./დოკ.გ/მიმ.</th>
              <th>სტატუსი</th>
              <th className="text-right">ქმედება</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <div className="flex items-center gap-2 font-medium">
                    {p.name}
                    {p.highlighted && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </td>
                <td className="font-mono text-xs">{p.key}</td>
                <td>{p.isFree || p.priceMinor === 0 ? "უფასო" : `${gel(p.priceMinor)} ${p.currency}/${p.period === "month" ? "თვე" : p.period}`}</td>
                <td className="text-muted-foreground">
                  {p.consultations} / {p.docGeneration} / {p.docReview}
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "აქტიური" : "გამორთ."}</Badge>
                    {p.visible ? <Badge variant="outline">ხილული</Badge> : <Badge variant="secondary">დამალული</Badge>}
                  </div>
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing({ ...p })} aria-label="რედაქტირება">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={busyId === p.id || p.isFree}
                      onClick={() => remove(p)}
                      aria-label="წაშლა"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  გეგმები არ არის
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PlanDialog
        plan={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          setLoading(true)
          load()
        }}
      />
    </div>
  )
}

function PlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: Plan | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Plan>(BLANK)
  const [priceGel, setPriceGel] = useState("0")
  const [featuresText, setFeaturesText] = useState("")
  const [featuresEnText, setFeaturesEnText] = useState("")
  const [saving, setSaving] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Sync local form when a different plan opens.
  if (plan && plan.id !== syncedId) {
    setSyncedId(plan.id)
    setForm({ ...plan })
    setPriceGel((plan.priceMinor / 100).toString())
    setFeaturesText((plan.features ?? []).join("\n"))
    setFeaturesEnText((plan.featuresEn ?? []).join("\n"))
  }
  if (!plan && syncedId !== null) setSyncedId(null)

  function set<K extends keyof Plan>(key: K, val: Plan[K]) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...form,
      priceMinor: Math.round((parseFloat(priceGel) || 0) * 100),
      features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
      featuresEn: featuresEnText.split("\n").map((s) => s.trim()).filter(Boolean),
    }
    try {
      const isNew = !form.id
      const res = await fetch(isNew ? "/api/admin/plans" : `/api/admin/plans/${form.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "შენახვა ვერ მოხერხდა")
        return
      }
      toast.success("შენახულია")
      onSaved()
    } catch {
      toast.error("ქსელის შეცდომა")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? "გეგმის რედაქტირება" : "ახალი გეგმა"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Key (a-z, 0-9, -)</Label>
              <Input value={form.key} onChange={(e) => set("key", e.target.value.toLowerCase())} placeholder="standard" className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>დასახელება (KA)</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="სტანდარტი" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Name (EN)</Label>
            <Input value={form.nameEn} onChange={(e) => set("nameEn", e.target.value)} placeholder="Standard" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>აღწერა (KA)</Label>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="ყველაზე პოპულარული" />
            </div>
            <div className="grid gap-2">
              <Label>Description (EN)</Label>
              <Input value={form.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} placeholder="Most popular" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>ფასი (₾/თვე)</Label>
              <Input type="number" min={0} step="0.01" value={priceGel} onChange={(e) => setPriceGel(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>რიგი</Label>
              <Input type="number" min={0} value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>ვალუტა</Label>
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>კონსულტაცია</Label>
              <Input type="number" min={0} value={form.consultations} onChange={(e) => set("consultations", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>დოკ. გენ.</Label>
              <Input type="number" min={0} value={form.docGeneration} onChange={(e) => set("docGeneration", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>დოკ. მიმ.</Label>
              <Input type="number" min={0} value={form.docReview} onChange={(e) => set("docReview", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>მახასიათებლები KA (თითო ხაზზე)</Label>
              <Textarea rows={4} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder={"9 კონსულტაცია თვეში\nმუხლების ციტირება"} />
            </div>
            <div className="grid gap-2">
              <Label>Features EN (one per line)</Label>
              <Textarea rows={4} value={featuresEnText} onChange={(e) => setFeaturesEnText(e.target.value)} placeholder={"9 consultations per month\nArticle citations"} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {([
              ["isFree", "უფასო"],
              ["highlighted", "გამოკვეთა"],
              ["visible", "ხილული"],
              ["active", "აქტიური"],
            ] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked as Plan[typeof k])} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={save} disabled={saving}>{saving ? "ინახება…" : "შენახვა"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
