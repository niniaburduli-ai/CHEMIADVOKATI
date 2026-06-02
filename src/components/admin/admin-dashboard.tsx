"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Pencil, ExternalLink, FileText, Users, ImageIcon } from "lucide-react";
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
  plan: "free" | "standard";
  consultationsRemaining: number;
  createdAt: string | null;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
  // Locale-independent (YYYY-MM-DD) to avoid SSR/client hydration mismatches.
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function AdminDashboard({
  initialUploads,
  initialUsers,
  currentUserId,
}: {
  initialUploads: UploadRow[];
  initialUsers: UserRow[];
  currentUserId: string;
}) {
  return (
    <Tabs defaultValue="users">
      <TabsList>
        <TabsTrigger value="users">
          <Users className="h-4 w-4 mr-2" /> მომხმარებლები
        </TabsTrigger>
        <TabsTrigger value="files">
          <FileText className="h-4 w-4 mr-2" /> ფაილები
        </TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-6">
        <UsersTable initial={initialUsers} currentUserId={currentUserId} />
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
    if (!confirm(`წავშალო მომხმარებელი ${u.email}? მისი ფაილებიც წაიშლება.`)) return;
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "წაშლა ვერ მოხერხდა");
        return;
      }
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("მომხმარებელი წაიშალა");
    } catch {
      toast.error("ქსელის შეცდომა");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(updated: UserRow) {
    setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    setEditing(null);
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>მომხმარებელი</th>
            <th>როლი</th>
            <th>გეგმა</th>
            <th>კონსულტ.</th>
            <th>რეგისტრ.</th>
            <th className="text-right">ქმედება</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                მომხმარებლები არ არის
              </td>
            </tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </td>
              <td>
                <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                  {u.role}
                </Badge>
              </td>
              <td>{u.plan}</td>
              <td>{u.consultationsRemaining}</td>
              <td className="text-muted-foreground">{formatDate(u.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(u)}
                    aria-label="რედაქტირება"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busyId === u.id || u.id === currentUserId}
                    onClick={() => handleDelete(u)}
                    aria-label="წაშლა"
                  >
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
        onSaved={handleSaved}
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
  const [plan, setPlan] = useState<"free" | "standard">("free");
  const [remaining, setRemaining] = useState("0");
  const [saving, setSaving] = useState(false);

  // Sync form state whenever a new user is opened.
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
        body: JSON.stringify({
          name,
          role,
          plan,
          consultationsRemaining: Number(remaining),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "შენახვა ვერ მოხერხდა");
        return;
      }
      toast.success("შენახულია");
      onSaved({
        ...user,
        name: data.name,
        role: data.role,
        plan: data.plan,
        consultationsRemaining: data.consultationsRemaining,
      });
    } catch {
      toast.error("ქსელის შეცდომა");
    } finally {
      setSaving(false);
    }
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
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "admin")}
              disabled={selfDemote}
              className="h-9 rounded-md border bg-transparent px-3 text-sm disabled:opacity-50"
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            {selfDemote && (
              <p className="text-xs text-muted-foreground">
                საკუთარ თავს ვერ ჩამოაქვეითებ.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-plan">გეგმა</Label>
            <select
              id="edit-plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value as "free" | "standard")}
              className="h-9 rounded-md border bg-transparent px-3 text-sm"
            >
              <option value="free">free</option>
              <option value="standard">standard</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-remaining">დარჩენილი კონსულტაცია</Label>
            <Input
              id="edit-remaining"
              type="number"
              min={0}
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            გაუქმება
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "ინახება..." : "შენახვა"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      if (!res.ok) {
        toast.error(data?.error ?? "წაშლა ვერ მოხერხდა");
        return;
      }
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
      toast.success("ფაილი წაიშალა");
    } catch {
      toast.error("ქსელის შეცდომა");
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(id: string, note: string) {
    setFiles((prev) => prev.map((x) => (x.id === id ? { ...x, note } : x)));
    setEditing(null);
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
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                ფაილები არ არის
              </td>
            </tr>
          )}
          {files.map((f) => (
            <tr key={f.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded border bg-muted flex items-center justify-center overflow-hidden">
                    {f.resourceType === "image" && f.format !== "pdf" ? (
                      <Image
                        src={f.url}
                        alt={f.originalName ?? "file"}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="max-w-[180px] truncate">
                    {f.originalName ?? f.publicId}
                  </span>
                </div>
              </td>
              <td>
                <div className="text-xs">
                  <div>{f.owner?.name ?? "—"}</div>
                  <div className="text-muted-foreground">{f.owner?.email ?? ""}</div>
                </div>
              </td>
              <td className="text-muted-foreground">{formatBytes(f.bytes)}</td>
              <td className="max-w-[160px] truncate text-muted-foreground">
                {f.note || "—"}
              </td>
              <td className="text-muted-foreground">{formatDate(f.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                    aria-label="გახსნა"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(f)}
                    aria-label="შენიშვნის რედაქტირება"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busyId === f.id}
                    onClick={() => handleDelete(f)}
                    aria-label="წაშლა"
                  >
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
        onSaved={handleSaved}
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
      if (!res.ok) {
        toast.error(data?.error ?? "შენახვა ვერ მოხერხდა");
        return;
      }
      toast.success("შენახულია");
      onSaved(file.id, data.note ?? note);
    } catch {
      toast.error("ქსელის შეცდომა");
    } finally {
      setSaving(false);
    }
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
          <Input
            id="edit-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="შენიშვნა ფაილზე..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            გაუქმება
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "ინახება..." : "შენახვა"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
