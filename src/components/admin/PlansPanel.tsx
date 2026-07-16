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
  discountPriceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
}

const BLANK: Plan = {
  id: "", key: "", name: "", nameEn: "", description: "", descriptionEn: "",
  priceMinor: 0, discountPriceMinor: 0, currency: "GEL", period: "month",
  consultations: 0, includeDocGeneration: true, docGeneration: 0, includeDocReview: true, docReview: 0,
  includeDocTemplates: true, docTemplates: 0,
  features: [], featuresEn: [],
  featuresDocGeneration: [], featuresDocGenerationEn: [],
  featuresDocReview: [], featuresDocReviewEn: [],
  featuresDocTemplates: [], featuresDocTemplatesEn: [],
  isFree: false, highlighted: false, visible: true, active: true, order: 0,
}

// Default feature texts per plan key — used to auto-populate empty fields when enabling a service.
const DEFAULT_GEN_KA: Record<string, string> = {
  standard: "9 დოკუმენტის გენერირება",
  premium: "99 დოკუმენტის გენერირება",
}
const DEFAULT_GEN_EN: Record<string, string> = {
  standard: "9 document generations",
  premium: "99 document generations",
}
const DEFAULT_REV_KA: Record<string, string> = {
  standard: "9 დოკუმენტის შემოწმება",
  premium: "99 დოკუმენტის/ხელშეკრულების შემოწმება",
}
const DEFAULT_REV_EN: Record<string, string> = {
  standard: "9 document reviews",
  premium: "99 document/contract reviews",
}
const DEFAULT_TPL_KA: Record<string, string> = {
  standard: "50 მზა შაბლონის შევსება",
  premium: "200 მზა შაბლონის შევსება",
}
const DEFAULT_TPL_EN: Record<string, string> = {
  standard: "50 ready-made template fills",
  premium: "200 ready-made template fills",
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
                <td>
                  {p.isFree || p.priceMinor === 0 ? (
                    "უფასო"
                  ) : p.discountPriceMinor > 0 && p.discountPriceMinor < p.priceMinor ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground line-through text-xs">{gel(p.priceMinor)}₾</span>
                      <span className="text-red-600 font-semibold">{gel(p.discountPriceMinor)}₾</span>
                      <Badge className="bg-red-600 text-white hover:bg-red-600">
                        -{Math.round((1 - p.discountPriceMinor / p.priceMinor) * 100)}%
                      </Badge>
                    </div>
                  ) : (
                    `${gel(p.priceMinor)} ${p.currency}/${p.period === "month" ? "თვე" : p.period}`
                  )}
                </td>
                <td>
                  <div className="text-muted-foreground text-xs">{p.consultations} კონს.</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocGeneration ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      გენ: {p.includeDocGeneration ? "✓" : "✗"}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocReview ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      დოკ: {p.includeDocReview ? "✓" : "✗"}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocTemplates ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      შაბლ: {p.includeDocTemplates ? "✓" : "✗"}
                    </span>
                  </div>
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
  const [discountGel, setDiscountGel] = useState("")
  const [featuresText, setFeaturesText] = useState("")
  const [featuresEnText, setFeaturesEnText] = useState("")
  const [featuresGenText, setFeaturesGenText] = useState("")
  const [featuresGenEnText, setFeaturesGenEnText] = useState("")
  const [featuresRevText, setFeaturesRevText] = useState("")
  const [featuresRevEnText, setFeaturesRevEnText] = useState("")
  const [featuresTplText, setFeaturesTplText] = useState("")
  const [featuresTplEnText, setFeaturesTplEnText] = useState("")
  const [saving, setSaving] = useState(false)
  const [syncedId, setSyncedId] = useState<string | null>(null)

  // Sync local form when a different plan opens.
  if (plan && plan.id !== syncedId) {
    setSyncedId(plan.id)
    setForm({ ...plan })
    setPriceGel((plan.priceMinor / 100).toString())
    setDiscountGel(plan.discountPriceMinor > 0 ? (plan.discountPriceMinor / 100).toString() : "")
    setFeaturesText((plan.features ?? []).join("\n"))
    setFeaturesEnText((plan.featuresEn ?? []).join("\n"))
    setFeaturesGenText((plan.featuresDocGeneration ?? []).join("\n"))
    setFeaturesGenEnText((plan.featuresDocGenerationEn ?? []).join("\n"))
    setFeaturesRevText((plan.featuresDocReview ?? []).join("\n"))
    setFeaturesRevEnText((plan.featuresDocReviewEn ?? []).join("\n"))
    setFeaturesTplText((plan.featuresDocTemplates ?? []).join("\n"))
    setFeaturesTplEnText((plan.featuresDocTemplatesEn ?? []).join("\n"))
  }
  if (!plan && syncedId !== null) setSyncedId(null)

  function set<K extends keyof Plan>(key: K, val: Plan[K]) {
    setForm((p) => ({ ...p, [key]: val }))
  }

  async function save() {
    const priceNum = parseFloat(priceGel) || 0
    const discountNum = discountGel.trim() ? parseFloat(discountGel) || 0 : 0
    if (discountNum > 0 && discountNum >= priceNum) {
      toast.error("ფასდაკლების ფასი უნდა იყოს რეგულარულ ფასზე ნაკლები")
      return
    }
    setSaving(true)
    const split = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean)
    const payload = {
      ...form,
      priceMinor: Math.round((parseFloat(priceGel) || 0) * 100),
      discountPriceMinor: discountGel.trim() ? Math.round((parseFloat(discountGel) || 0) * 100) : 0,
      features: split(featuresText),
      featuresEn: split(featuresEnText),
      featuresDocGeneration: split(featuresGenText),
      featuresDocGenerationEn: split(featuresGenEnText),
      featuresDocReview: split(featuresRevText),
      featuresDocReviewEn: split(featuresRevEnText),
      featuresDocTemplates: split(featuresTplText),
      featuresDocTemplatesEn: split(featuresTplEnText),
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
          <div className="grid gap-2">
            <Label>ფასდაკლების ფასი (₾) — ცარიელი = ფასდაკლების გარეშე</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min={0} step="0.01" value={discountGel} onChange={(e) => setDiscountGel(e.target.value)} placeholder="99" className="max-w-[160px]" />
              {discountGel.trim() && parseFloat(discountGel) > 0 && parseFloat(discountGel) < parseFloat(priceGel || "0") && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground line-through">{priceGel}₾</span>
                  <span className="text-red-600 font-semibold">{discountGel}₾</span>
                  <Badge className="bg-red-600 text-white hover:bg-red-600">
                    -{Math.round((1 - parseFloat(discountGel) / parseFloat(priceGel || "1")) * 100)}%
                  </Badge>
                </div>
              )}
              {discountGel.trim() && parseFloat(discountGel) >= parseFloat(priceGel || "0") && (
                <span className="text-xs text-destructive">ფასდაკლების ფასი უნდა იყოს რეგულარულ ფასზე ნაკლები</span>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>კონსულტაცია</Label>
              <Input type="number" min={0} value={form.consultations} onChange={(e) => set("consultations", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocGeneration}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocGeneration", checked)
                    if (checked && !featuresGenText.trim()) {
                      setFeaturesGenText(DEFAULT_GEN_KA[form.key] ?? "")
                      setFeaturesGenEnText(DEFAULT_GEN_EN[form.key] ?? "")
                    }
                  }}
                />
                დოკ. გენ. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docGeneration} disabled={!form.includeDocGeneration} onChange={(e) => set("docGeneration", Number(e.target.value))} className={!form.includeDocGeneration ? "opacity-40" : ""} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocReview}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocReview", checked)
                    if (checked && !featuresRevText.trim()) {
                      setFeaturesRevText(DEFAULT_REV_KA[form.key] ?? "")
                      setFeaturesRevEnText(DEFAULT_REV_EN[form.key] ?? "")
                    }
                  }}
                />
                დოკ. მიმ. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docReview} disabled={!form.includeDocReview} onChange={(e) => set("docReview", Number(e.target.value))} className={!form.includeDocReview ? "opacity-40" : ""} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocTemplates}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocTemplates", checked)
                    if (checked && !featuresTplText.trim()) {
                      setFeaturesTplText(DEFAULT_TPL_KA[form.key] ?? "")
                      setFeaturesTplEnText(DEFAULT_TPL_EN[form.key] ?? "")
                    }
                  }}
                />
                შაბლ. შევს. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docTemplates} disabled={!form.includeDocTemplates} onChange={(e) => set("docTemplates", Number(e.target.value))} className={!form.includeDocTemplates ? "opacity-40" : ""} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>მახასიათებლები KA — ბაზა (თითო ხაზზე)</Label>
              <Textarea rows={3} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder={"9 კონსულტაცია თვეში\nმუხლების ციტირება"} />
            </div>
            <div className="grid gap-2">
              <Label>Base Features EN (one per line)</Label>
              <Textarea rows={3} value={featuresEnText} onChange={(e) => setFeaturesEnText(e.target.value)} placeholder={"9 consultations per month\nArticle citations"} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!form.includeDocGeneration ? "text-muted-foreground" : ""}>დოკ. გენ. KA {!form.includeDocGeneration && "(გამორთ.)"}</Label>
              <Textarea rows={2} value={featuresGenText} onChange={(e) => setFeaturesGenText(e.target.value)} disabled={!form.includeDocGeneration} className={!form.includeDocGeneration ? "opacity-40" : ""} placeholder={"9 დოკუმენტის გენერირება"} />
            </div>
            <div className="grid gap-2">
              <Label className={!form.includeDocGeneration ? "text-muted-foreground" : ""}>Document Gen. EN {!form.includeDocGeneration && "(disabled)"}</Label>
              <Textarea rows={2} value={featuresGenEnText} onChange={(e) => setFeaturesGenEnText(e.target.value)} disabled={!form.includeDocGeneration} className={!form.includeDocGeneration ? "opacity-40" : ""} placeholder={"9 document generations"} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!form.includeDocReview ? "text-muted-foreground" : ""}>დოკ. მიმ. KA {!form.includeDocReview && "(გამორთ.)"}</Label>
              <Textarea rows={2} value={featuresRevText} onChange={(e) => setFeaturesRevText(e.target.value)} disabled={!form.includeDocReview} className={!form.includeDocReview ? "opacity-40" : ""} placeholder={"9 დოკუმენტის შემოწმება"} />
            </div>
            <div className="grid gap-2">
              <Label className={!form.includeDocReview ? "text-muted-foreground" : ""}>Doc Review EN {!form.includeDocReview && "(disabled)"}</Label>
              <Textarea rows={2} value={featuresRevEnText} onChange={(e) => setFeaturesRevEnText(e.target.value)} disabled={!form.includeDocReview} className={!form.includeDocReview ? "opacity-40" : ""} placeholder={"9 document reviews"} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!form.includeDocTemplates ? "text-muted-foreground" : ""}>შაბლ. შევს. KA {!form.includeDocTemplates && "(გამორთ.)"}</Label>
              <Textarea rows={2} value={featuresTplText} onChange={(e) => setFeaturesTplText(e.target.value)} disabled={!form.includeDocTemplates} className={!form.includeDocTemplates ? "opacity-40" : ""} placeholder={"50 მზა შაბლონის შევსება"} />
            </div>
            <div className="grid gap-2">
              <Label className={!form.includeDocTemplates ? "text-muted-foreground" : ""}>Templates EN {!form.includeDocTemplates && "(disabled)"}</Label>
              <Textarea rows={2} value={featuresTplEnText} onChange={(e) => setFeaturesTplEnText(e.target.value)} disabled={!form.includeDocTemplates} className={!form.includeDocTemplates ? "opacity-40" : ""} placeholder={"50 ready-made template fills"} />
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
