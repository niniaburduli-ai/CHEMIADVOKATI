"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Trash2,
  Pencil,
  ExternalLink,
  FileText,
  Users,
  ImageIcon,
  MessagesSquare,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DOC_TYPES } from "@/lib/validators";

export type UploadRow = {
  id: string;
  url: string;
  publicId: string;
  bytes: number;
  format: string | null;
  resourceType: string;
  originalName: string | null;
  note: string;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "user" | "admin";
  plan: "free" | "standard" | "premium";
  consultationsRemaining: number;
  docGenerationRemaining: number;
  docReviewRemaining: number;
  createdAt: string | null;
};

export type ConsultationRow = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

export type GeneratedDocRow = {
  id: string;
  title: string;
  type: string;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

export type ReviewRow = {
  id: string;
  fileName: string;
  summary: string;
  findingsCount: number;
  recommendationsCount: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function AdminDashboard({
  initialUploads,
  initialUsers,
  initialConsultations,
  initialGeneratedDocs,
  initialReviews,
  currentUserId,
}: {
  initialUploads: UploadRow[];
  initialUsers: UserRow[];
  initialConsultations: ConsultationRow[];
  initialGeneratedDocs: GeneratedDocRow[];
  initialReviews: ReviewRow[];
  currentUserId: string;
}) {
  return (
    <Tabs defaultValue="users">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="users">
          <Users className="h-4 w-4 mr-2" /> მომხმარებლები ({initialUsers.length})
        </TabsTrigger>
        <TabsTrigger value="consultations">
          <MessagesSquare className="h-4 w-4 mr-2" /> კონსულტაციები ({initialConsultations.length})
        </TabsTrigger>
        <TabsTrigger value="documents">
          <FileText className="h-4 w-4 mr-2" /> დოკუმენტები ({initialGeneratedDocs.length})
        </TabsTrigger>
        <TabsTrigger value="reviews">
          <FileSearch className="h-4 w-4 mr-2" /> მიმოხილვები ({initialReviews.length})
        </TabsTrigger>
        <TabsTrigger value="files">
          <ImageIcon className="h-4 w-4 mr-2" /> ფაილები ({initialUploads.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="mt-6">
        <UsersTable initial={initialUsers} currentUserId={currentUserId} />
      </TabsContent>
      <TabsContent value="consultations" className="mt-6">
        <ConsultationsTable initial={initialConsultations} />
      </TabsContent>
      <TabsContent value="documents" className="mt-6">
        <GeneratedDocsTable initial={initialGeneratedDocs} />
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        <ReviewsTable initial={initialReviews} />
      </TabsContent>
      <TabsContent value="files" className="mt-6">
        <UploadsTable initial={initialUploads} />
      </TabsContent>
    </Tabs>
  );
}

/* -------------------------------- Users -------------------------------- */

function UsersTable({
  initial,
  currentUserId,
}: {
  initial: UserRow[];
  currentUserId: string;
}) {
  const [users, setUsers] = useState<UserRow[]>(initial);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(u: UserRow) {
    if (u.id === currentUserId) {
      toast.error("საკუთარი ანგარიშის წაშლა შეუძლებელია");
      return;
    }
    if (!confirm(`წავშალო მომხმარებელი ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? "წაშლა ვერ მოხერხდა"); return; }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("მომხმარებელი წაიშალა");
    } catch { toast.error("ქსელის შეცდომა"); }
    finally { setBusyId(null); }
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>მომხმარებელი</th>
            <th>როლი</th>
            <th>გეგმა</th>
            <th>კონს.</th>
            <th>დოკ.გ</th>
            <th>მიმ.</th>
            <th>რეგ.</th>
            <th className="text-right">ქმედება</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">მომხმარებლები არ არის</td></tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </td>
              <td><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></td>
              <td>{u.plan}</td>
              <td>{u.consultationsRemaining}</td>
              <td>{u.docGenerationRemaining}</td>
              <td>{u.docReviewRemaining}</td>
              <td className="text-muted-foreground">{formatDate(u.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(u)} aria-label="რედაქტირება">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={busyId === u.id || u.id === currentUserId} onClick={() => handleDelete(u)} aria-label="წაშლა">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <EditUserDialog
        user={editing}
        currentUserId={currentUserId}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditUserDialog({
  user,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  currentUserId: string;
  onClose: () => void;
  onSaved: (u: UserRow) => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [plan, setPlan] = useState<"free" | "standard" | "premium">("free");
  const [remaining, setRemaining] = useState("0");
  const [saving, setSaving] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  if (user && user.id !== syncedId) {
    setSyncedId(user.id);
    setName(user.name);
    setRole(user.role);
    setPlan(user.plan);
    setRemaining(String(user.consultationsRemaining));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, plan, consultationsRemaining: Number(remaining) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? "შენახვა ვერ მოხერხდა"); return; }
      toast.success("შენახულია");
      onSaved({ ...user, name: data.name, role: data.role, plan: data.plan, consultationsRemaining: data.consultationsRemaining });
    } catch { toast.error("ქსელის შეცდომა"); }
    finally { setSaving(false); }
  }

  const selfDemote = user?.id === currentUserId;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>მომხმარებლის რედაქტირება</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">სახელი</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-role">როლი</Label>
            <select id="edit-role" value={role} onChange={(e) => setRole(e.target.value as "user" | "admin")} disabled={selfDemote} className="h-9 rounded-md border bg-transparent px-3 text-sm disabled:opacity-50">
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            {selfDemote && <p className="text-xs text-muted-foreground">საკუთარ თავს ვერ ჩამოაქვეითებ.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-plan">გეგმა</Label>
            <select id="edit-plan" value={plan} onChange={(e) => setPlan(e.target.value as "free" | "standard" | "premium")} className="h-9 rounded-md border bg-transparent px-3 text-sm">
              <option value="free">free</option>
              <option value="standard">standard</option>
              <option value="premium">premium</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-remaining">დარჩ. კონსულტაცია</Label>
            <Input id="edit-remaining" type="number" min={0} value={remaining} onChange={(e) => setRemaining(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={save} disabled={saving}>{saving ? "ინახება..." : "შენახვა"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- Consultations -------------------------------- */

function ConsultationsTable({ initial }: { initial: ConsultationRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>შეკითხვა</th>
            <th>მომხმარებელი</th>
            <th>თარიღი</th>
            <th className="text-right">პასუხი</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">კონსულტაციები არ არის</td></tr>
          )}
          {initial.map((c) => (
            <>
              <tr key={c.id} className="border-b [&>td]:px-4 [&>td]:py-3">
                <td className="max-w-[280px]">
                  <div className="truncate font-medium">{c.question}</div>
                </td>
                <td>
                  <div className="text-xs">
                    <div>{c.owner?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{c.owner?.email ?? ""}</div>
                  </div>
                </td>
                <td className="text-muted-foreground">{formatDate(c.createdAt)}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    {expanded === c.id ? "დახურვა" : "ნახვა"}
                  </Button>
                </td>
              </tr>
              {expanded === c.id && (
                <tr key={`${c.id}-exp`} className="border-b bg-muted/20">
                  <td colSpan={4} className="px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.answer}</p>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Generated Docs -------------------------------- */

function GeneratedDocsTable({ initial }: { initial: GeneratedDocRow[] }) {
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>სათაური</th>
            <th>ტიპი</th>
            <th>მომხმარებელი</th>
            <th>თარიღი</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">დოკუმენტები არ არის</td></tr>
          )}
          {initial.map((d) => (
            <tr key={d.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td className="max-w-[260px] truncate font-medium">{d.title}</td>
              <td>
                <Badge variant="secondary" className="text-xs">
                  {DOC_TYPES[d.type as keyof typeof DOC_TYPES] ?? d.type}
                </Badge>
              </td>
              <td>
                <div className="text-xs">
                  <div>{d.owner?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{d.owner?.email ?? ""}</div>
                </div>
              </td>
              <td className="text-muted-foreground">{formatDate(d.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Reviews -------------------------------- */

function ReviewsTable({ initial }: { initial: ReviewRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>ფაილი</th>
            <th>მომხმარებელი</th>
            <th>პრობლ.</th>
            <th>რეკ.</th>
            <th>თარიღი</th>
            <th className="text-right">შეჯამება</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">მიმოხილვები არ არის</td></tr>
          )}
          {initial.map((r) => (
            <>
              <tr key={r.id} className="border-b [&>td]:px-4 [&>td]:py-3">
                <td className="max-w-[180px] truncate font-medium">{r.fileName}</td>
                <td>
                  <div className="text-xs">
                    <div>{r.owner?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{r.owner?.email ?? ""}</div>
                  </div>
                </td>
                <td>{r.findingsCount}</td>
                <td>{r.recommendationsCount}</td>
                <td className="text-muted-foreground">{formatDate(r.createdAt)}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    {expanded === r.id ? "დახურვა" : "ნახვა"}
                  </Button>
                </td>
              </tr>
              {expanded === r.id && (
                <tr key={`${r.id}-exp`} className="border-b bg-muted/20">
                  <td colSpan={6} className="px-4 py-3">
                    <p className="text-sm leading-relaxed">{r.summary}</p>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Files -------------------------------- */

function UploadsTable({ initial }: { initial: UploadRow[] }) {
  const [files, setFiles] = useState<UploadRow[]>(initial);
  const [editing, setEditing] = useState<UploadRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(f: UploadRow) {
    if (!confirm(`წავშალო ფაილი ${f.originalName ?? f.publicId}?`)) return;
    setBusyId(f.id);
    try {
      const res = await fetch(`/api/admin/uploads/${f.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? "წაშლა ვერ მოხერხდა"); return; }
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
      toast.success("ფაილი წაიშალა");
    } catch { toast.error("ქსელის შეცდომა"); }
    finally { setBusyId(null); }
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>ფაილი</th>
            <th>მფლობელი</th>
            <th>ზომა</th>
            <th>შენიშვნა</th>
            <th>თარიღი</th>
            <th className="text-right">ქმედება</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ფაილები არ არის</td></tr>
          )}
          {files.map((f) => (
            <tr key={f.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                    {f.resourceType === "image" && f.format !== "pdf" ? (
                      <Image src={f.url} alt={f.originalName ?? "file"} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="max-w-[180px] truncate">{f.originalName ?? f.publicId}</span>
                </div>
              </td>
              <td>
                <div className="text-xs">
                  <div>{f.owner?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{f.owner?.email ?? ""}</div>
                </div>
              </td>
              <td className="text-muted-foreground">{formatBytes(f.bytes)}</td>
              <td className="max-w-[160px] truncate text-muted-foreground">{f.note || "—"}</td>
              <td className="text-muted-foreground">{formatDate(f.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent" aria-label="გახსნა">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)} aria-label="შენიშვნა">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" disabled={busyId === f.id} onClick={() => handleDelete(f)} aria-label="წაშლა">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <EditNoteDialog
        file={editing}
        onClose={() => setEditing(null)}
        onSaved={(id, note) => {
          setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, note } : x)));
          setEditing(null);
        }}
      />
    </div>
  );
}

function EditNoteDialog({
  file,
  onClose,
  onSaved,
}: {
  file: UploadRow | null;
  onClose: () => void;
  onSaved: (id: string, note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);

  if (file && file.id !== syncedId) {
    setSyncedId(file.id);
    setNote(file.note);
  }

  async function save() {
    if (!file) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/uploads/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? "შენახვა ვერ მოხერხდა"); return; }
      toast.success("შენახულია");
      onSaved(file.id, data.note ?? note);
    } catch { toast.error("ქსელის შეცდომა"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>შენიშვნა</DialogTitle>
          <DialogDescription>{file?.originalName ?? file?.publicId}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="edit-note">ტექსტი</Label>
          <Input id="edit-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="შენიშვნა ფაილზე..." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={save} disabled={saving}>{saving ? "ინახება..." : "შენახვა"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
