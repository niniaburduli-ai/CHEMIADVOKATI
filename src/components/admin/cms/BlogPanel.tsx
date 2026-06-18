"use client"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { BlogPostEditor } from "./BlogPostEditor"
import type { BlogPostData, BlogCategoryData } from "@/types/cms"

export function BlogPanel() {
  const [posts, setPosts] = useState<BlogPostData[]>([])
  const [categories, setCategories] = useState<BlogCategoryData[]>([])
  const [tab, setTab] = useState<"posts" | "categories">("posts")
  const [editing, setEditing] = useState<BlogPostData | null | "new">(null)
  const [newCat, setNewCat] = useState({ name: "", slug: "" })

  const load = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/admin/cms/blog/posts"),
      fetch("/api/admin/cms/blog/categories"),
    ])
    const [pd, cd] = await Promise.all([pRes.json(), cRes.json()])
    setPosts(pd.items ?? []); setCategories(cd.items ?? [])
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/admin/cms/blog/posts"),
        fetch("/api/admin/cms/blog/categories"),
      ])
      const [pd, cd] = await Promise.all([pRes.json(), cRes.json()])
      if (active) {
        setPosts(pd.items ?? [])
        setCategories(cd.items ?? [])
      }
    })()
    return () => {
      active = false
    }
  }, [])

  async function deletePost(id: string) {
    if (!confirm("წაშლა?")) return
    await fetch(`/api/admin/cms/blog/posts/${id}`, { method: "DELETE" })
    setPosts((p) => p.filter((x) => x._id !== id))
  }

  async function createCategory() {
    if (!newCat.name || !newCat.slug) return
    const res = await fetch("/api/admin/cms/blog/categories", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newCat, status: "published" }),
    })
    const { data } = await res.json()
    setCategories((p) => [...p, data]); setNewCat({ name: "", slug: "" })
  }

  async function deleteCategory(id: string) {
    if (!confirm("წაშლა?")) return
    await fetch(`/api/admin/cms/blog/categories/${id}`, { method: "DELETE" })
    setCategories((p) => p.filter((x) => x._id !== id))
  }

  if (editing) {
    return (
      <BlogPostEditor
        post={editing === "new" ? null : editing}
        categories={categories}
        onSave={() => { load(); setEditing(null) }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ბლოგი</h2>
        <div className="flex gap-2">
          <Button variant={tab === "posts" ? "default" : "outline"} size="sm" onClick={() => setTab("posts")}>პოსტები</Button>
          <Button variant={tab === "categories" ? "default" : "outline"} size="sm" onClick={() => setTab("categories")}>კატეგორიები</Button>
        </div>
      </div>

      {tab === "posts" && (
        <>
          <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-2 h-4 w-4" /> ახალი პოსტი</Button>
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>{["სათაური", "სტატუსი", "თარიღი", ""].map((h) => <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p._id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2">{p.title}</td>
                    <td className="px-4 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                        p.status === "published" ? "bg-green-100 text-green-700" :
                        p.status === "hidden" ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                      )}>{p.status}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("ka-GE") : "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => deletePost(p._id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {posts.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">პოსტები არ არის</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="სახელი" value={newCat.name}
              onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
            <input className="rounded-md border px-3 py-2 text-sm font-mono" placeholder="slug" value={newCat.slug}
              onChange={(e) => setNewCat((p) => ({ ...p, slug: e.target.value }))} />
            <Button size="sm" onClick={createCategory}><Plus className="mr-1 h-3 w-3" /> Add</Button>
          </div>
          <div className="rounded-lg border divide-y">
            {categories.map((c) => (
              <div key={c._id} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm">{c.name} <span className="ml-2 font-mono text-xs text-muted-foreground">/{c.slug}</span></span>
                <Button size="icon" variant="ghost" onClick={() => deleteCategory(c._id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            ))}
            {categories.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">კატეგორიები არ არის</p>}
          </div>
        </div>
      )}
    </div>
  )
}
