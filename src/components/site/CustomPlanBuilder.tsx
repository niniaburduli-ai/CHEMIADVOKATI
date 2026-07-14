"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Slider } from "@/components/ui/slider"
import {
  CUSTOM_SERVICES,
  computeCustomTotal,
  type CustomPlanRatesData,
  type CustomSelection,
  type CustomService,
} from "@/lib/custom-plan-rates-config"

type ServiceMeta = { key: CustomService; label: string }

export function CustomPlanBuilder({
  rates,
  steps,
  services,
  strings,
}: {
  rates: CustomPlanRatesData
  steps: readonly number[]
  services: ServiceMeta[]
  strings: {
    heading: string
    subtitle: string
    buildAndPay: string
    selectAtLeastOne: string
    checkoutError: string
    networkError: string
  }
}) {
  const [enabled, setEnabled] = useState<Record<CustomService, boolean>>({
    consultations: false,
    docTemplates: false,
    docGeneration: false,
    docReview: false,
  })
  const [index, setIndex] = useState<Record<CustomService, number>>({
    consultations: 0,
    docTemplates: 0,
    docGeneration: 0,
    docReview: 0,
  })
  const [loading, setLoading] = useState(false)

  const selection: CustomSelection = useMemo(() => {
    const out = {} as CustomSelection
    for (const service of CUSTOM_SERVICES) {
      out[service] = enabled[service] ? steps[index[service]] : 0
    }
    return out
  }, [enabled, index, steps])

  const total = computeCustomTotal(rates, selection)
  const gel = total !== null ? (total / 100).toFixed(2).replace(/\.00$/, "") : "0"

  async function buildAndPay() {
    if (total === null || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/checkout/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      })
      if (res.status === 401) {
        const back = encodeURIComponent(window.location.pathname || "/pricing")
        window.location.href = `/login?callbackUrl=${back}`
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? strings.checkoutError)
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      toast.error(strings.networkError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative rounded-2xl border border-border bg-card flex flex-col p-7 card-hover h-full">
      <p className="font-bold text-base mb-1 text-primary">{strings.heading}</p>
      <p className="text-sm text-muted-foreground mb-6">{strings.subtitle}</p>

      <div className="space-y-5 flex-1">
        {services.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled[s.key]}
                onClick={() => setEnabled((p) => ({ ...p, [s.key]: !p[s.key] }))}
                className={[
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  enabled[s.key] ? "bg-primary" : "bg-gray-300 dark:bg-gray-700",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all",
                    enabled[s.key] ? "left-[22px]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
            {enabled[s.key] && (
              <div className="flex items-center gap-3">
                <Slider
                  min={0}
                  max={steps.length - 1}
                  step={1}
                  value={[index[s.key]]}
                  onValueChange={(v) => {
                    const next = Array.isArray(v) ? v[0] : (v as number)
                    setIndex((p) => ({ ...p, [s.key]: next }))
                  }}
                  className="flex-1"
                />
                <span className="w-12 shrink-0 text-right text-sm tabular-nums text-foreground">
                  {steps[index[s.key]]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-end gap-1 mb-4">
          <span className="text-5xl font-bold text-foreground leading-none">{gel}</span>
          <span className="text-lg font-semibold text-foreground mb-0.5">₾</span>
        </div>
        <button
          type="button"
          onClick={buildAndPay}
          disabled={total === null || loading}
          className="w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 btn-hover border border-border text-primary hover:bg-primary/5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : total === null ? (
            strings.selectAtLeastOne
          ) : (
            strings.buildAndPay
          )}
        </button>
      </div>
    </div>
  )
}
