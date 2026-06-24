"use client"

import { useState } from "react"
import { Search, BookOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { getDict } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/config"
import { LEGISLATION_DOCS } from "./legislation-data"

export function LegislationClient({ locale }: { locale: Locale }) {
  const d = getDict(locale)
  const [q, setQ] = useState("")
  const [cat, setCat] = useState("all")

  const categories: Array<{ id: string; label: string }> = [
    { id: "all", label: d.legislation.catAll },
    { id: "labor", label: d.legislation.catLabor },
    { id: "civil", label: d.legislation.catCivil },
    { id: "admin", label: d.legislation.catAdmin },
    { id: "consumer", label: d.legislation.catConsumer },
    { id: "tax", label: d.legislation.catTax },
    { id: "privacy", label: d.legislation.catPrivacy },
    { id: "constitution", label: d.legislation.catConstitution },
    { id: "finance", label: d.legislation.catFinance },
  ]

  const filtered = LEGISLATION_DOCS.filter((doc) => {
    const matchCat = cat === "all" || doc.tagId === cat
    const title = doc.title[locale]
    const description = doc.description[locale]
    const catLabel = categories.find((c) => c.id === doc.tagId)?.label ?? ""
    const matchQ =
      !q ||
      title.toLowerCase().includes(q.toLowerCase()) ||
      description.toLowerCase().includes(q.toLowerCase()) ||
      catLabel.toLowerCase().includes(q.toLowerCase())
    return matchCat && matchQ
  })

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{d.legislation.title}</h1>
        <p className="text-muted-foreground mt-1">{d.legislation.subtitle}</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={d.legislation.searchPlaceholder}
          className="pl-9"
        />
      </div>

      <Tabs value={cat} onValueChange={setCat} className="mb-6">
        <TabsList className="flex flex-wrap h-auto">
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={cat} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-[#f7f7ff] border border-[#e0e0ff] rounded-2xl px-6 py-7 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="shrink-0 w-12 h-12 rounded-full bg-[#ededff] flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-[#6366f1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#3730a3] leading-snug">{doc.title[locale]}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{doc.description[locale]}</p>
                  <Badge variant="secondary" className="mt-3 text-xs">
                    {categories.find((c) => c.id === doc.tagId)?.label ?? doc.tagId}
                  </Badge>
                </div>
              </a>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              {d.legislation.noResults}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
