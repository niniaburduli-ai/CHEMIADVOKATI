"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CUSTOM_SERVICES,
  STEP_QUANTITIES,
  DEFAULT_CUSTOM_RATES,
  DEFAULT_CUSTOM_DISCOUNT_RATES,
  type CustomPlanRatesData,
} from "@/lib/custom-plan-rates-config"

const DISCOUNT_FIELD: Record<(typeof CUSTOM_SERVICES)[number], string> = {
  consultations: "discountConsultations",
  docTemplates: "discountDocTemplates",
  docGeneration: "discountDocGeneration",
  docReview: "discountDocReview",
}

const SERVICE_LABELS: Record<(typeof CUSTOM_SERVICES)[number], string> = {
  consultations: "კონსულტაციები",
  docTemplates: "მზა შაბლონები",
  docGeneration: "დოკუმენტის გენერაცია",
  docReview: "დოკუმენტის ანალიზი",
}

export function CustomPlanRatesPanel() {
  const [rates, setRates] = useState<CustomPlanRatesData>(DEFAULT_CUSTOM_RATES)
  const [discountRates, setDiscountRates] = useState<CustomPlanRatesData>(DEFAULT_CUSTOM_DISCOUNT_RATES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch("/api/admin/custom-plan-rates")
      const { data } = await res.json()
      if (active && data) {
        setRates(data.rates)
        setDiscountRates(data.discountRates)
      }
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

  function setDiscountCell(service: (typeof CUSTOM_SERVICES)[number], idx: number, gel: string) {
    const minor = gel.trim() ? Math.round((Number(gel) || 0) * 100) : 0
    setDiscountRates((p) => {
      const next = { ...p, [service]: [...p[service]] }
      next[service][idx] = minor
      return next
    })
  }

  async function save() {
    for (const service of CUSTOM_SERVICES) {
      for (let i = 0; i < STEP_QUANTITIES.length; i++) {
        const discount = discountRates[service][i]
        if (discount > 0 && discount >= rates[service][i]) {
          toast.error("ფასდაკლების ფასი უნდა იყოს რეგულარულ ფასზე ნაკლები")
          return
        }
      }
    }
    setSaving(true)
    try {
      const body: Record<string, number[]> = { ...rates }
      for (const service of CUSTOM_SERVICES) {
        body[DISCOUNT_FIELD[service]] = discountRates[service]
      }
      const res = await fetch("/api/admin/custom-plan-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast.error(err?.error ?? "შენახვა ვერ მოხერხდა")
        return
      }
      const { data } = await res.json()
      if (data) {
        setRates(data.rates)
        setDiscountRates(data.discountRates)
      }
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
                {STEP_QUANTITIES.map((q, idx) => {
                  const regular = rates[service][idx] / 100
                  const discountMinor = discountRates[service][idx]
                  const discount = discountMinor > 0 ? discountMinor / 100 : null
                  const hasDiscount = discount !== null && discount < regular
                  const percent = hasDiscount ? Math.round((1 - discount / regular) * 100) : 0
                  return (
                    <td key={q} className="px-2 py-2 align-top">
                      <Label className="sr-only" htmlFor={`${service}-${q}`}>
                        {SERVICE_LABELS[service]} {q}
                      </Label>
                      <Input
                        id={`${service}-${q}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={regular.toString()}
                        onChange={(e) => setCell(service, idx, e.target.value)}
                        className="w-24 text-right"
                      />
                      <div className="mt-1 text-right text-xs text-muted-foreground">
                        ₾{(regular / q).toFixed(2)} / ერთეული
                      </div>
                      <Label className="sr-only" htmlFor={`${service}-${q}-discount`}>
                        {SERVICE_LABELS[service]} {q} ფასდაკლება
                      </Label>
                      <Input
                        id={`${service}-${q}-discount`}
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="ფასდაკლება"
                        value={discount !== null ? discount.toString() : ""}
                        onChange={(e) => setDiscountCell(service, idx, e.target.value)}
                        className="mt-2 w-24 text-right"
                      />
                      {hasDiscount && (
                        <div className="mt-1 flex flex-col items-end gap-0.5">
                          <span className="text-muted-foreground line-through text-xs">₾{regular.toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-semibold text-xs">₾{discount.toFixed(2)}</span>
                            <Badge className="bg-red-600 text-white hover:bg-red-600 px-1 py-0 text-[10px]">
                              -{percent}%
                            </Badge>
                          </div>
                        </div>
                      )}
                      {discount !== null && discount >= regular && (
                        <div className="mt-1 text-right text-[10px] text-destructive">ნაკლები უნდა იყოს</div>
                      )}
                    </td>
                  )
                })}
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
