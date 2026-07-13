"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CUSTOM_SERVICES,
  STEP_QUANTITIES,
  DEFAULT_CUSTOM_RATES,
  type CustomPlanRatesData,
} from "@/lib/custom-plan-rates-config"

const SERVICE_LABELS: Record<(typeof CUSTOM_SERVICES)[number], string> = {
  consultations: "კონსულტაციები",
  docTemplates: "მზა შაბლონები",
  docGeneration: "დოკუმენტის გენერაცია",
  docReview: "დოკუმენტის ანალიზი",
}

export function CustomPlanRatesPanel() {
  const [rates, setRates] = useState<CustomPlanRatesData>(DEFAULT_CUSTOM_RATES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch("/api/admin/custom-plan-rates")
      const { data } = await res.json()
      if (active && data) setRates(data)
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  function setCell(service: (typeof CUSTOM_SERVICES)[number], idx: number, gel: string) {
    const minor = Math.round((Number(gel) || 0) * 100)
    setRates((p) => {
      const next = { ...p, [service]: [...p[service]] }
      next[service][idx] = minor
      return next
    })
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/custom-plan-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rates),
      })
      if (!res.ok) {
        toast.error("შენახვა ვერ მოხერხდა")
        return
      }
      const { data } = await res.json()
      if (data) setRates(data)
      toast.success("ფასები განახლდა")
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ინდივიდუალური პაკეტის ფასები</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          თითოეული სერვისისთვის, თითოეულ რაოდენობაზე ფასი ლარში (₾). ცვლილება მყისიერად აისახება /pricing გვერდზე.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2 text-left font-medium">სერვისი</th>
              {STEP_QUANTITIES.map((q) => (
                <th key={q} className="px-4 py-2 text-right font-medium">{q}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CUSTOM_SERVICES.map((service) => (
              <tr key={service} className="border-b last:border-b-0">
                <td className="px-4 py-2 font-medium">{SERVICE_LABELS[service]}</td>
                {STEP_QUANTITIES.map((q, idx) => (
                  <td key={q} className="px-2 py-2">
                    <Label className="sr-only" htmlFor={`${service}-${q}`}>
                      {SERVICE_LABELS[service]} {q}
                    </Label>
                    <Input
                      id={`${service}-${q}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={(rates[service][idx] / 100).toString()}
                      onChange={(e) => setCell(service, idx, e.target.value)}
                      className="w-24 text-right"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
