"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FEATURE_DEFS, DEFAULT_FLAGS, type FeatureFlagsData, type FeatureKey } from "@/lib/features-config"

export function FeaturesPanel() {
  const [flags, setFlags] = useState<FeatureFlagsData>(DEFAULT_FLAGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch("/api/admin/features")
      const { data } = await res.json()
      if (active && data) {
        setFlags(data)
        setLoading(false)
      } else if (active) {
        setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  function toggle(key: FeatureKey) {
    setFlags((p) => ({ ...p, [key]: !p[key] }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flags),
      })
      if (!res.ok) {
        toast.error("შენახვა ვერ მოხერხდა")
        return
      }
      const { data } = await res.json()
      if (data) setFlags(data)
      toast.success("ფუნქციები განახლდა")
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ფუნქციები</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          გამორთული ფუნქცია იმალება ნავიგაციიდან და მთავარი გვერდიდან, ხოლო მისი გვერდი იბლოკება.
        </p>
      </div>

      <div className="divide-y rounded-lg border">
        {FEATURE_DEFS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <div className="font-medium">{f.label}</div>
              <div className="text-xs text-muted-foreground">{f.description}</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flags[f.key]}
              onClick={() => toggle(f.key)}
              className={[
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                flags[f.key] ? "bg-primary" : "bg-input",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all",
                  flags[f.key] ? "left-[22px]" : "left-0.5",
                ].join(" ")}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          შენახვა
        </Button>
      </div>
    </div>
  )
}
