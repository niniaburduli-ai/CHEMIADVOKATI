"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

type Coll = { slug: string; label: string; labelKa: string; count: number }
type Doc = Record<string, unknown>

const LIMIT = 25

const DATE_KEYS = ["createdAt", "updatedAt"]

function addField(parts: string[], k: string, v: unknown): void {
  if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
    const s = String(v).replace(/\s+/g, " ").trim()
    parts.push(`${k}: ${s.length > 60 ? s.slice(0, 60) + "…" : s}`)
  }
}

/** Timestamp first (if present), then up to 5 more scalar fields in schema order. */
function preview(doc: Doc): string {
  const parts: string[] = []
  for (const k of DATE_KEYS) {
    if (k in doc) {
      addField(parts, k, doc[k])
      break
    }
  }
  for (const [k, v] of Object.entries(doc)) {
    if (k === "_id" || k === "__v" || DATE_KEYS.includes(k)) continue
    addField(parts, k, v)
    if (parts.length >= 6) break
  }
  return parts.join("  ·  ") || "—"
}

export function DatabasePanel() {
  const [colls, setColls] = useState<Coll[]>([])
  const [active, setActive] = useState<string>("")
  const [rows, setRows] = useState<Doc[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{ doc: Doc; isNew: boolean } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadRows = useCallback(
    async (slug: string, nextSkip: number) => {
      if (!slug) return
      setActive(slug)
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/db/${slug}?skip=${nextSkip}&limit=${LIMIT}`)
        const { data, total } = await res.json()
        setRows(data ?? [])
        setTotal(total ?? 0)
        setSkip(nextSkip)
      } catch {
        toast.error("ჩატვირთვა ვერ მოხერხდა")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Load the collection list once, then open the first collection. State updates
  // live in the async callback (not the effect body) to avoid cascading renders.
  useEffect(() => {
    fetch("/api/admin/db/collections")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.length) {
          setColls(data)
          loadRows(data[0].slug, 0)
        }
      })
  }, [loadRows])

  async function remove(doc: Doc) {
    const id = String(doc._id)
    if (!confirm("ჩანაწერი წაიშლება (ან დაარქივდება, თუ აუდიტისთვის მუდმივი ტიპია). გავაგრძელო?")) return
    setBusyId(id)
    try {
      const res = await fetch(`/api/admin/db/${active}/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error ?? "წაშლა ვერ მოხერხდა")
        return
      }
      toast.success(data?.archived ? "დაარქივდა" : "წაიშალა")
      loadRows(active, skip)
    } catch {
      toast.error("ქსელის შეცდომა")
    } finally {
      setBusyId(null)
    }
  }

  const activeColl = colls.find((c) => c.slug === active)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          <select
            value={active}
            onChange={(e) => loadRows(e.target.value, 0)}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {colls.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.labelKa} / {c.label} ({c.count})
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          disabled={!active}
          onClick={() => setEditing({ doc: {}, isNew: true })}
        >
          <Plus className="mr-2 h-4 w-4" /> ახალი ჩანაწერი
        </Button>
      </div>

      <div className="relative overflow-x-auto rounded-lg border">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
              <th className="w-[220px]">_id</th>
              <th>მონაცემები</th>
              <th className="text-right">ქმედება</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  ჩანაწერები არ არის
                </td>
              </tr>
            )}
            {rows.map((d) => {
                const id = String(d._id)
                return (
                  <tr key={id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3 align-top">
                    <td className="font-mono text-xs text-muted-foreground">{id}</td>
                    <td className="max-w-[640px] truncate text-xs" title={preview(d)}>{preview(d)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing({ doc: d, isNew: false })} aria-label="რედაქტირება">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" disabled={busyId === id} onClick={() => remove(d)} aria-label="წაშლა">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {activeColl && total > LIMIT && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {skip + 1}–{Math.min(skip + LIMIT, total)} / {total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={skip === 0 || loading} onClick={() => loadRows(active, Math.max(0, skip - LIMIT))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={skip + LIMIT >= total || loading} onClick={() => loadRows(active, skip + LIMIT)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <JsonEditorDialog
        state={editing}
        collection={active}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          loadRows(active, skip)
        }}
      />
    </div>
  )
}

function JsonEditorDialog({
  state,
  collection,
  onClose,
  onSaved,
}: {
  state: { doc: Doc; isNew: boolean } | null
  collection: string
  onClose: () => void
  onSaved: () => void
}) {
  const [text, setText] = useState("{}")
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(false)

  if (state && !synced) {
    setSynced(true)
    const { _id, __v, ...rest } = state.doc as Doc & { _id?: unknown; __v?: unknown }
    void _id
    void __v
    setText(JSON.stringify(rest, null, 2))
  }
  if (!state && synced) setSynced(false)

  async function save() {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      toast.error("არასწორი JSON")
      return
    }
    setSaving(true)
    try {
      const isNew = state?.isNew
      const id = state ? String((state.doc as { _id?: unknown })._id ?? "") : ""
      const res = await fetch(
        isNew ? `/api/admin/db/${collection}` : `/api/admin/db/${collection}/${id}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        }
      )
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
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{state?.isNew ? "ახალი ჩანაწერი" : "ჩანაწერის რედაქტირება"}</DialogTitle>
          <DialogDescription>
            {collection} · JSON. სისტემური ველები (_id, createdAt) იგნორირდება.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="font-mono text-xs"
          spellCheck={false}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={save} disabled={saving}>{saving ? "ინახება…" : "შენახვა"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
