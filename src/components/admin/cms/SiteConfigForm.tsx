"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "./ImageUpload"
import { Loader2, Save } from "lucide-react"
import type { SiteConfigData } from "@/types/cms"
import type { Locale } from "@/lib/i18n/config"

const EMPTY: SiteConfigData = {
  logoUrl: "", logoPubId: "", siteName: "", tagline: "", favicon: "",
  contactEmail: "", contactPhone: "", contactAddress: "",
  socialLinks: { facebook: "", twitter: "", linkedin: "", youtube: "" },
}

export function SiteConfigForm({ locale = "ka" }: { locale?: Locale }) {
  const [data, setData] = useState<SiteConfigData>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      const r = await fetch(`/api/admin/cms/site-config?locale=${locale}`)
      const { data: d } = await r.json()
      if (active) setData(d ? { ...EMPTY, ...d } : EMPTY)
    })()
    return () => { active = false }
  }, [locale])

  function set<K extends keyof SiteConfigData>(key: K, val: SiteConfigData[K]) {
    setData((p) => ({ ...p, [key]: val }))
  }

  async function save() {
    setSaving(true); setMsg("")
    await fetch(`/api/admin/cms/site-config?locale=${locale}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    setMsg("შენახულია"); setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold">საიტის პარამეტრები</h2>

      <ImageUpload label="Logo" value={data.logoUrl} pubId={data.logoPubId}
        onUpload={(url, pubId) => setData((p) => ({ ...p, logoUrl: url, logoPubId: pubId }))} />

      <div className="grid gap-4 sm:grid-cols-2">
        {(["siteName", "tagline", "contactEmail", "contactPhone", "contactAddress"] as const).map((k) => (
          <div key={k} className={k === "contactAddress" ? "sm:col-span-2" : ""}>
            <Label>{k}</Label>
            <Input value={(data[k] as string) ?? ""} onChange={(e) => set(k, e.target.value as SiteConfigData[typeof k])} />
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Social Links</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["facebook", "twitter", "linkedin", "youtube"] as const).map((k) => (
            <div key={k}>
              <Label>{k}</Label>
              <Input value={data.socialLinks[k] ?? ""}
                onChange={(e) => setData((p) => ({ ...p, socialLinks: { ...p.socialLinks, [k]: e.target.value } }))} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          შენახვა
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </div>
  )
}
