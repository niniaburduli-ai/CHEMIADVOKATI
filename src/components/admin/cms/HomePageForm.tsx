"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "./ImageUpload"
import {
  Eye, EyeOff, Loader2, Plus, Save, Trash2, ChevronUp, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  HomePageData, HomePageServiceCard, HomePageStatCard, HomePageFeature, HomePagePlan,
} from "@/types/cms"

// Generates a valid MongoDB ObjectId-compatible hex string (24 chars)
function uid(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("")
}

function moveItem<T extends { order: number }>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next.map((x, idx) => ({ ...x, order: idx }))
}

const EMPTY: HomePageData = {
  sections: { hero: true, stats: true, features: true, pricing: true, faq: true },
  hero: { title: "", titleEn: "", subtitle: "", subtitleEn: "", ctaText: "", ctaHref: "", imageUrl: "", imagePubId: "" },
  serviceCards: [],
  cardsHeading: "", cardsHeadingEn: "",
  statsHeading: "", statsHeadingEn: "",
  stats: [],
  featuresHeading: "", featuresHeadingEn: "",
  features: [],
  pricingHeading: "", pricingHeadingEn: "",
  plans: [],
  faqHeading: "", faqHeadingEn: "",
  ctaSection: { buttonText: "", buttonTextEn: "", buttonHref: "" },
  status: "draft",
}

function Vis({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      title={value ? "ხილული" : "დამალული"}
      className={cn(
        "rounded p-1 transition-colors shrink-0",
        value
          ? "text-foreground hover:text-foreground/70"
          : "text-muted-foreground/30 hover:text-muted-foreground/60"
      )}
    >
      {value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  )
}

function Reorder({
  onUp, onDown, isFirst, isLast,
}: { onUp: () => void; onDown: () => void; isFirst: boolean; isLast: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0 pt-1">
      <button
        type="button" onClick={onUp} disabled={isFirst}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button" onClick={onDown} disabled={isLast}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function SectionHeader({
  title, visible, onToggle,
}: { title: string; visible: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-medium">{title}</h3>
      <Vis value={visible} onChange={onToggle} />
    </div>
  )
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="rounded p-1 text-destructive hover:bg-destructive/10 shrink-0"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}

/** Two-column KA + EN input pair */
function BiInput({
  label, kaValue, enValue,
  onKa, onEn, textarea = false,
}: {
  label: string
  kaValue: string
  enValue: string
  onKa: (v: string) => void
  onEn: (v: string) => void
  textarea?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium">🇬🇪 KA</span>
          {textarea ? (
            <Textarea rows={2} value={kaValue} onChange={(e) => onKa(e.target.value)} />
          ) : (
            <Input value={kaValue} onChange={(e) => onKa(e.target.value)} />
          )}
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium">🇬🇧 EN</span>
          {textarea ? (
            <Textarea rows={2} value={enValue} onChange={(e) => onEn(e.target.value)} />
          ) : (
            <Input value={enValue} onChange={(e) => onEn(e.target.value)} />
          )}
        </div>
      </div>
    </div>
  )
}

export function HomePageForm() {
  const [data, setData] = useState<HomePageData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      const r = await fetch("/api/admin/cms/homepage")
      const { data: d } = await r.json()
      if (active && d) setData({ ...EMPTY, ...d })
    })()
    return () => { active = false }
  }, [])

  async function save(status: HomePageData["status"]) {
    setSaving(true)
    setMsg("")
    try {
      const res = await fetch("/api/admin/cms/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setData((p) => ({ ...p, status }))
      setMsg("შენახულია")
    } catch {
      setMsg("შეცდომა — ვერ შეინახა")
    } finally {
      setSaving(false)
    }
  }

  const upd = <K extends keyof HomePageData>(key: K, val: HomePageData[K]) =>
    setData((p) => ({ ...p, [key]: val }))

  // ── Service card helpers ──────────────────────────────────────────────────────

  function addCard() {
    setData((p) => ({
      ...p,
      serviceCards: [
        ...p.serviceCards,
        { _id: uid(), title: "", titleEn: "", subtitle: "", subtitleEn: "", ctaText: "", ctaTextEn: "", href: "", icon: "", comingSoon: false, visible: true, order: p.serviceCards.length },
      ],
    }))
  }

  function updCard(i: number, patch: Partial<HomePageServiceCard>) {
    setData((p) => {
      const serviceCards = [...p.serviceCards]
      serviceCards[i] = { ...serviceCards[i], ...patch }
      return { ...p, serviceCards }
    })
  }

  function delCard(i: number) {
    setData((p) => ({
      ...p,
      serviceCards: p.serviceCards.filter((_, j) => j !== i).map((c, idx) => ({ ...c, order: idx })),
    }))
  }

  // ── Stat helpers ──────────────────────────────────────────────────────────────

  function addStat() {
    setData((p) => ({
      ...p,
      stats: [...p.stats, { _id: uid(), label: "", labelEn: "", value: "0", icon: "", visible: true, order: p.stats.length }],
    }))
  }

  function updStat(i: number, patch: Partial<HomePageStatCard>) {
    setData((p) => {
      const stats = [...p.stats]
      stats[i] = { ...stats[i], ...patch }
      return { ...p, stats }
    })
  }

  function delStat(i: number) {
    setData((p) => ({
      ...p,
      stats: p.stats.filter((_, j) => j !== i).map((s, idx) => ({ ...s, order: idx })),
    }))
  }

  // ── Feature helpers ───────────────────────────────────────────────────────────

  function addFeature() {
    setData((p) => ({
      ...p,
      features: [...p.features, { _id: uid(), title: "", titleEn: "", body: "", bodyEn: "", icon: "", order: p.features.length, visible: true }],
    }))
  }

  function updFeature(i: number, patch: Partial<HomePageFeature>) {
    setData((p) => {
      const features = [...p.features]
      features[i] = { ...features[i], ...patch }
      return { ...p, features }
    })
  }

  function delFeature(i: number) {
    setData((p) => ({
      ...p,
      features: p.features.filter((_, j) => j !== i).map((f, idx) => ({ ...f, order: idx })),
    }))
  }

  // ── Plan helpers ──────────────────────────────────────────────────────────────

  function addPlan() {
    setData((p) => ({
      ...p,
      plans: [
        ...p.plans,
        { _id: uid(), name: "", price: "0", badge: "", ctaText: "", ctaHref: "/register", plan: "", highlighted: false, visible: true, order: p.plans.length, items: [] },
      ],
    }))
  }

  function updPlan(i: number, patch: Partial<HomePagePlan>) {
    setData((p) => {
      const plans = [...p.plans]
      plans[i] = { ...plans[i], ...patch }
      return { ...p, plans }
    })
  }

  function delPlan(i: number) {
    setData((p) => ({
      ...p,
      plans: p.plans.filter((_, j) => j !== i).map((pl, idx) => ({ ...pl, order: idx })),
    }))
  }

  function addPlanItem(pi: number) {
    setData((p) => {
      const plans = [...p.plans]
      plans[pi] = { ...plans[pi], items: [...plans[pi].items, ""] }
      return { ...p, plans }
    })
  }

  function updPlanItem(pi: number, ii: number, val: string) {
    setData((p) => {
      const plans = [...p.plans]
      const items = [...plans[pi].items]
      items[ii] = val
      plans[pi] = { ...plans[pi], items }
      return { ...p, plans }
    })
  }

  function delPlanItem(pi: number, ii: number) {
    setData((p) => {
      const plans = [...p.plans]
      plans[pi] = { ...plans[pi], items: plans[pi].items.filter((_, j) => j !== ii) }
      return { ...p, plans }
    })
  }

  const sec = data.sections

  return (
    <div className="space-y-8 max-w-3xl">
      <h2 className="text-lg font-semibold">მთავარი გვერდი</h2>

      {/* ── Section visibility overview ── */}
      <section className="space-y-1 rounded-lg border p-4">
        <h3 className="font-medium mb-3">სექციების ხილვადობა</h3>
        {(["hero", "stats", "features", "pricing", "faq"] as const).map((key) => (
          <div key={key} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40">
            <span className="text-sm text-muted-foreground">{key}</span>
            <Vis
              value={sec[key]}
              onChange={(v) => setData((p) => ({ ...p, sections: { ...p.sections, [key]: v } }))}
            />
          </div>
        ))}
      </section>

      {/* ── Hero ── */}
      <section className="space-y-4 rounded-lg border p-4">
        <SectionHeader
          title="Hero სექცია"
          visible={sec.hero}
          onToggle={() => setData((p) => ({ ...p, sections: { ...p.sections, hero: !p.sections.hero } }))}
        />

        <BiInput
          label="Title"
          kaValue={data.hero.title}
          enValue={data.hero.titleEn ?? ""}
          onKa={(v) => setData((p) => ({ ...p, hero: { ...p.hero, title: v } }))}
          onEn={(v) => setData((p) => ({ ...p, hero: { ...p.hero, titleEn: v } }))}
        />
        <BiInput
          label="Subtitle"
          kaValue={data.hero.subtitle}
          enValue={data.hero.subtitleEn ?? ""}
          onKa={(v) => setData((p) => ({ ...p, hero: { ...p.hero, subtitle: v } }))}
          onEn={(v) => setData((p) => ({ ...p, hero: { ...p.hero, subtitleEn: v } }))}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {(["ctaText", "ctaHref"] as const).map((k) => (
            <div key={k}>
              <Label className="text-xs">{k}</Label>
              <Input
                value={data.hero[k]}
                onChange={(e) => setData((p) => ({ ...p, hero: { ...p.hero, [k]: e.target.value } }))}
              />
            </div>
          ))}
        </div>

        <ImageUpload
          label="Hero Image"
          value={data.hero.imageUrl}
          pubId={data.hero.imagePubId}
          onUpload={(url, pubId) =>
            setData((p) => ({ ...p, hero: { ...p.hero, imageUrl: url, imagePubId: pubId } }))
          }
        />

        {/* Service cards */}
        <BiInput
          label="სექციის სათაური (მომსახურებები)"
          kaValue={data.cardsHeading}
          enValue={data.cardsHeadingEn ?? ""}
          onKa={(v) => upd("cardsHeading", v)}
          onEn={(v) => upd("cardsHeadingEn", v)}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">სერვისის ბარათები</h4>
            <Button type="button" size="sm" variant="outline" onClick={addCard}>
              <Plus className="mr-1 h-3 w-3" /> Add
            </Button>
          </div>

          {data.serviceCards.map((card, i) => (
            <div key={card._id} className="flex gap-2 rounded border p-3 items-start">
              <Reorder
                onUp={() => setData((p) => ({ ...p, serviceCards: moveItem(p.serviceCards, i, -1) }))}
                onDown={() => setData((p) => ({ ...p, serviceCards: moveItem(p.serviceCards, i, 1) }))}
                isFirst={i === 0}
                isLast={i === data.serviceCards.length - 1}
              />
              <div className="flex-1 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Icon (lucide name)</Label>
                    <Input value={card.icon} onChange={(e) => updCard(i, { icon: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Href</Label>
                    <Input value={card.href} onChange={(e) => updCard(i, { href: e.target.value })} />
                  </div>
                </div>
                <BiInput
                  label="Title"
                  kaValue={card.title}
                  enValue={card.titleEn ?? ""}
                  onKa={(v) => updCard(i, { title: v })}
                  onEn={(v) => updCard(i, { titleEn: v })}
                />
                <BiInput
                  label="Subtitle"
                  kaValue={card.subtitle}
                  enValue={card.subtitleEn ?? ""}
                  onKa={(v) => updCard(i, { subtitle: v })}
                  onEn={(v) => updCard(i, { subtitleEn: v })}
                />
                <BiInput
                  label="CTA Text"
                  kaValue={card.ctaText ?? ""}
                  enValue={card.ctaTextEn ?? ""}
                  onKa={(v) => updCard(i, { ctaText: v })}
                  onEn={(v) => updCard(i, { ctaTextEn: v })}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`cs-${card._id}`}
                    checked={card.comingSoon}
                    onChange={(e) => updCard(i, { comingSoon: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`cs-${card._id}`} className="text-xs text-muted-foreground cursor-pointer">
                    Coming soon (disables link, shows badge)
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Vis value={card.visible} onChange={(v) => updCard(i, { visible: v })} />
                <DeleteBtn onClick={() => delCard(i)} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <SectionHeader
          title="სტატისტიკა"
          visible={sec.stats}
          onToggle={() => setData((p) => ({ ...p, sections: { ...p.sections, stats: !p.sections.stats } }))}
        />

        <BiInput
          label="სექციის სათაური"
          kaValue={data.statsHeading}
          enValue={data.statsHeadingEn ?? ""}
          onKa={(v) => upd("statsHeading", v)}
          onEn={(v) => upd("statsHeadingEn", v)}
        />

        <div className="space-y-2">
          {data.stats.map((s, i) => (
            <div key={s._id} className="flex gap-2 rounded border p-3 items-start">
              <Reorder
                onUp={() => setData((p) => ({ ...p, stats: moveItem(p.stats, i, -1) }))}
                onDown={() => setData((p) => ({ ...p, stats: moveItem(p.stats, i, 1) }))}
                isFirst={i === 0}
                isLast={i === data.stats.length - 1}
              />
              <div className="flex-1 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Icon (lucide name)</Label>
                    <Input value={s.icon} onChange={(e) => updStat(i, { icon: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">ცოცხალი მაჩვენებელი (Live metric)</Label>
                    <select
                      value={s.metric ?? ""}
                      onChange={(e) => updStat(i, { metric: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    >
                      <option value="">— ხელით (manual value) —</option>
                      <option value="users">რეგისტრირებული მომხმარებლები</option>
                      <option value="consultations">დასმული კითხვები</option>
                      <option value="documents">გამოყენებული შაბლონები</option>
                      <option value="reviews">დამუშავებული დოკუმენტები</option>
                      <option value="uploads">ატვირთული ფაილები</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">{'Value (e.g. "19+") — when manual'}</Label>
                    <Input
                      value={s.value}
                      disabled={!!s.metric}
                      onChange={(e) => updStat(i, { value: e.target.value })}
                    />
                  </div>
                </div>
                <BiInput
                  label="Label"
                  kaValue={s.label}
                  enValue={s.labelEn ?? ""}
                  onKa={(v) => updStat(i, { label: v })}
                  onEn={(v) => updStat(i, { labelEn: v })}
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Vis value={s.visible} onChange={(v) => updStat(i, { visible: v })} />
                <DeleteBtn onClick={() => delStat(i)} />
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addStat}>
            <Plus className="mr-1 h-3 w-3" /> Add Stat
          </Button>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <SectionHeader
          title='Features ("რატომ ჩვენ")'
          visible={sec.features}
          onToggle={() => setData((p) => ({ ...p, sections: { ...p.sections, features: !p.sections.features } }))}
        />

        <BiInput
          label="სექციის სათაური"
          kaValue={data.featuresHeading}
          enValue={data.featuresHeadingEn ?? ""}
          onKa={(v) => upd("featuresHeading", v)}
          onEn={(v) => upd("featuresHeadingEn", v)}
        />

        <div className="space-y-2">
          {data.features.map((f, i) => (
            <div key={f._id} className="flex gap-2 rounded border p-3 items-start">
              <Reorder
                onUp={() => setData((p) => ({ ...p, features: moveItem(p.features, i, -1) }))}
                onDown={() => setData((p) => ({ ...p, features: moveItem(p.features, i, 1) }))}
                isFirst={i === 0}
                isLast={i === data.features.length - 1}
              />
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-xs">Icon (lucide name)</Label>
                  <Input value={f.icon} onChange={(e) => updFeature(i, { icon: e.target.value })} />
                </div>
                <BiInput
                  label="Title"
                  kaValue={f.title}
                  enValue={f.titleEn ?? ""}
                  onKa={(v) => updFeature(i, { title: v })}
                  onEn={(v) => updFeature(i, { titleEn: v })}
                />
                <BiInput
                  label="Description"
                  kaValue={f.body}
                  enValue={f.bodyEn ?? ""}
                  onKa={(v) => updFeature(i, { body: v })}
                  onEn={(v) => updFeature(i, { bodyEn: v })}
                  textarea
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Vis value={f.visible} onChange={(v) => updFeature(i, { visible: v })} />
                <DeleteBtn onClick={() => delFeature(i)} />
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addFeature}>
            <Plus className="mr-1 h-3 w-3" /> Add Feature
          </Button>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <SectionHeader
          title="პაკეტები (Pricing)"
          visible={sec.pricing}
          onToggle={() => setData((p) => ({ ...p, sections: { ...p.sections, pricing: !p.sections.pricing } }))}
        />

        <BiInput
          label="სექციის სათაური"
          kaValue={data.pricingHeading}
          enValue={data.pricingHeadingEn ?? ""}
          onKa={(v) => upd("pricingHeading", v)}
          onEn={(v) => upd("pricingHeadingEn", v)}
        />

        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          ფასები და პაკეტები იმართება „გეგმები&quot; ტაბიდან — ეს სექცია ავტომატურად ასახავს მათ. აქ მხოლოდ სათაურსა და ხილვადობას აკონტროლებ.
        </p>

        <div className="hidden space-y-3">
          {data.plans.map((plan, pi) => (
            <div key={plan._id} className="rounded border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Reorder
                  onUp={() => setData((p) => ({ ...p, plans: moveItem(p.plans, pi, -1) }))}
                  onDown={() => setData((p) => ({ ...p, plans: moveItem(p.plans, pi, 1) }))}
                  isFirst={pi === 0}
                  isLast={pi === data.plans.length - 1}
                />
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={plan.name} onChange={(e) => updPlan(pi, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Price (₾)</Label>
                    <Input value={plan.price} onChange={(e) => updPlan(pi, { price: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Badge (empty = none)</Label>
                    <Input value={plan.badge} onChange={(e) => updPlan(pi, { badge: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Plan type</Label>
                    <select
                      value={plan.plan}
                      onChange={(e) => updPlan(pi, { plan: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    >
                      <option value="">Free (renders Link)</option>
                      <option value="standard">standard</option>
                      <option value="premium">premium</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">CTA Text</Label>
                    <Input value={plan.ctaText} onChange={(e) => updPlan(pi, { ctaText: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">CTA Href</Label>
                    <Input value={plan.ctaHref} onChange={(e) => updPlan(pi, { ctaHref: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <input
                      type="checkbox"
                      id={`hl-${plan._id}`}
                      checked={plan.highlighted}
                      onChange={(e) => updPlan(pi, { highlighted: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label htmlFor={`hl-${plan._id}`} className="text-xs text-muted-foreground cursor-pointer">
                      Highlighted (featured card style)
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Vis value={plan.visible} onChange={(v) => updPlan(pi, { visible: v })} />
                  <DeleteBtn onClick={() => delPlan(pi)} />
                </div>
              </div>

              <div className="space-y-1.5 pl-8 border-t pt-3">
                <Label className="text-xs">Feature bullets</Label>
                {plan.items.map((item, ii) => (
                  <div key={ii} className="flex gap-2">
                    <Input value={item} onChange={(e) => updPlanItem(pi, ii, e.target.value)} />
                    <DeleteBtn onClick={() => delPlanItem(pi, ii)} />
                  </div>
                ))}
                <Button type="button" size="sm" variant="ghost" onClick={() => addPlanItem(pi)}>
                  <Plus className="mr-1 h-3 w-3" /> Add bullet
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={addPlan}>
            <Plus className="mr-1 h-3 w-3" /> Add Plan
          </Button>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <SectionHeader
          title="კითხვა-პასუხი (FAQ)"
          visible={sec.faq}
          onToggle={() => setData((p) => ({ ...p, sections: { ...p.sections, faq: !p.sections.faq } }))}
        />

        <BiInput
          label="სექციის სათაური"
          kaValue={data.faqHeading}
          enValue={data.faqHeadingEn ?? ""}
          onKa={(v) => upd("faqHeading", v)}
          onEn={(v) => upd("faqHeadingEn", v)}
        />

        <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          კითხვები და პასუხები იმართება „კითხვა-პასუხი (FAQ)&quot; ტაბიდან — ეს სექცია ავტომატურად ასახავს გამოქვეყნებულ ჩანაწერებს. აქ მხოლოდ სათაურსა და ხილვადობას აკონტროლებ.
        </p>
      </section>

      {/* ── CTA button (hero) ── */}
      <section className="space-y-3 rounded-lg border p-4">
        <h3 className="font-medium">სარეგისტრაციო ღილაკი (Hero)</h3>
        <BiInput
          label="Button text"
          kaValue={data.ctaSection.buttonText}
          enValue={data.ctaSection.buttonTextEn ?? ""}
          onKa={(v) => setData((p) => ({ ...p, ctaSection: { ...p.ctaSection, buttonText: v } }))}
          onEn={(v) => setData((p) => ({ ...p, ctaSection: { ...p.ctaSection, buttonTextEn: v } }))}
        />
        <div>
          <Label className="text-xs">Button href</Label>
          <Input
            value={data.ctaSection.buttonHref}
            onChange={(e) => setData((p) => ({ ...p, ctaSection: { ...p.ctaSection, buttonHref: e.target.value } }))}
          />
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={() => save("draft")} disabled={saving} variant="outline">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Draft
        </Button>
        <Button onClick={() => save("published")} disabled={saving}>
          გამოქვეყნება
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
          {data.status}
        </span>
      </div>
    </div>
  )
}
