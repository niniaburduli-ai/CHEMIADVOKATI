"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  THEME_TOKENS,
  FONT_CHOICES,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  DEFAULT_THEME,
  type FontChoice,
  type ThemeConfigData,
} from "@/lib/theme-tokens"

function ColorGrid({
  tokens,
  onChange,
}: {
  tokens: Record<string, string>
  onChange: (key: string, val: string) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {THEME_TOKENS.map((t) => (
        <div key={t.key} className="flex items-center gap-3 rounded-md border px-3 py-2">
          <input
            type="color"
            value={tokens[t.key] ?? "#000000"}
            onChange={(e) => onChange(t.key, e.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded border bg-transparent p-0.5"
            aria-label={t.label}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{t.label}</div>
            <Input
              value={tokens[t.key] ?? ""}
              onChange={(e) => onChange(t.key, e.target.value)}
              className="mt-1 h-7 font-mono text-xs"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Preview({ tokens, radius }: { tokens: Record<string, string>; radius: string }) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{
        background: tokens.background,
        color: tokens.foreground,
        borderColor: tokens.border,
        // @ts-expect-error custom prop
        "--r": radius,
      }}
    >
      <p className="mb-3 text-sm font-semibold">წინასწარი ხედი</p>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="px-4 py-2 text-sm font-medium"
          style={{ background: tokens.primary, color: tokens["primary-foreground"], borderRadius: radius }}
        >
          მთავარი ღილაკი
        </span>
        <span
          className="px-4 py-2 text-sm font-medium"
          style={{ background: tokens.secondary, color: tokens["secondary-foreground"], borderRadius: radius }}
        >
          მეორადი
        </span>
        <span
          className="px-4 py-2 text-sm font-medium"
          style={{ background: tokens.accent, color: tokens["accent-foreground"], borderRadius: radius }}
        >
          აქცენტი
        </span>
        <span
          className="px-4 py-2 text-sm font-medium"
          style={{ background: tokens.destructive, color: "#fff", borderRadius: radius }}
        >
          საფრთხე
        </span>
      </div>
      <p className="mt-3 text-sm" style={{ color: tokens["muted-foreground"] }}>
        მქრქალი ტექსტის ნიმუში მკითხველისთვის.
      </p>
    </div>
  )
}

export function ThemePanel() {
  const [cfg, setCfg] = useState<ThemeConfigData>(DEFAULT_THEME)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/admin/cms/theme")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setCfg(data)
      })
      .finally(() => setLoading(false))
  }, [])

  function setToken(mode: "light" | "dark", key: string, val: string) {
    setCfg((p) => ({ ...p, [mode]: { ...p[mode], [key]: val } }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/cms/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      })
      if (!res.ok) {
        toast.error("შენახვა ვერ მოხერხდა")
        return
      }
      const { data } = await res.json()
      if (data) setCfg(data)
      toast.success("თემა შენახულია — განახლდება გადატვირთვისას")
    } catch {
      toast.error("ქსელის შეცდომა")
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება…
      </div>
    )

  const radiusNum = parseFloat(cfg.radius) || 0.625

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">თემა და ტიპოგრაფია</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCfg({ ...DEFAULT_THEME, light: { ...DEFAULT_LIGHT }, dark: { ...DEFAULT_DARK } })}
        >
          <RotateCcw className="mr-2 h-4 w-4" /> ნაგულისხმევზე დაბრუნება
        </Button>
      </div>

      {/* Typography */}
      <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
        <div>
          <Label>ფონტი</Label>
          <select
            value={cfg.fontFamily}
            onChange={(e) => setCfg((p) => ({ ...p, fontFamily: e.target.value as FontChoice }))}
            className="mt-1 h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {FONT_CHOICES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>ტექსტის ზომა: {cfg.baseFontSize}px</Label>
          <input
            type="range"
            min={12}
            max={22}
            step={1}
            value={cfg.baseFontSize}
            onChange={(e) => setCfg((p) => ({ ...p, baseFontSize: Number(e.target.value) }))}
            className="mt-3 w-full"
          />
        </div>
        <div>
          <Label>კუთხის მომრგვალება: {radiusNum}rem</Label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.125}
            value={radiusNum}
            onChange={(e) => setCfg((p) => ({ ...p, radius: `${e.target.value}rem` }))}
            className="mt-3 w-full"
          />
        </div>
      </div>

      {/* Colors */}
      <Tabs defaultValue="light">
        <TabsList>
          <TabsTrigger value="light">ღია (Light)</TabsTrigger>
          <TabsTrigger value="dark">მუქი (Dark)</TabsTrigger>
        </TabsList>
        <TabsContent value="light" className="mt-4 space-y-4">
          <ColorGrid tokens={cfg.light} onChange={(k, v) => setToken("light", k, v)} />
          <Preview tokens={cfg.light} radius={cfg.radius} />
        </TabsContent>
        <TabsContent value="dark" className="mt-4 space-y-4">
          <ColorGrid tokens={cfg.dark} onChange={(k, v) => setToken("dark", k, v)} />
          <Preview tokens={cfg.dark} radius={cfg.radius} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 flex justify-end border-t bg-background py-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          შენახვა
        </Button>
      </div>
    </div>
  )
}
