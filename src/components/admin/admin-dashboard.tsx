"use client";

import React, { useState } from "react";
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
  LayoutDashboard,
  BarChart3,
  Palette,
  CreditCard,
  SlidersHorizontal,
  Database,
  ToggleRight,
  Menu,
  Scale,
  Star,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CMSPanel } from "@/components/admin/cms/CMSPanel";
import { OverviewPanel } from "@/components/admin/OverviewPanel";
import { ThemePanel } from "@/components/admin/ThemePanel";
import { PlansPanel } from "@/components/admin/PlansPanel";
import { CustomPlanRatesPanel } from "@/components/admin/CustomPlanRatesPanel";
import { DatabasePanel } from "@/components/admin/DatabasePanel";
import { FeaturesPanel } from "@/components/admin/FeaturesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  plan: string;
  consultationsRemaining: number;
  docGenerationRemaining: number;
  docReviewRemaining: number;
  docTemplatesRemaining?: number;
  planExpiresAt?: string | null;
  createdAt: string | null;
  totalAiCostUsd: number;
};

export type ConsultationRow = {
  id: string;
  question: string;
  answer: string;
  modelTier: string | null;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

/** Human-readable label for the model tier that produced a consultation's
 * answer — lets a non-technical admin see free-vs-paid usage at a glance,
 * no server logs needed. `null` covers consultations saved before this
 * field existed. */
const MODEL_TIER_LABEL: Record<string, string> = {
  free1: "უფასო 1",
  free2: "უფასო 2",
  cheap: "იაფი",
  complex: "ძვირი",
  web: "ვები",
  cached: "ქეშიდან",
};

function formatModelTier(tier: string | null): string {
  if (!tier) return "—";
  return MODEL_TIER_LABEL[tier] ?? tier;
}

/** NBG official USD/GEL rate. Update if it drifts significantly. */
const GEL_RATE = 2.6285;

function trimTrailingZeros(s: string): string {
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

/** USD with GEL equivalent in parentheses, e.g. "$0.0054 (~0.014 ₾)".
 * USD uses 4-5 decimals so cheap calls stay visible instead of rounding
 * to "$0.00". "—" for untracked/zero-cost records (cache hits, pre-tracking
 * rows). */
function formatCostUsd(costUsd: number): string {
  if (!costUsd || costUsd <= 0) return "—";
  const usdDecimals = costUsd < 0.01 ? 5 : 4;
  const usdStr = trimTrailingZeros(costUsd.toFixed(usdDecimals));
  const gelStr = trimTrailingZeros((costUsd * GEL_RATE).toFixed(3));
  return `$${usdStr} (~${gelStr} ₾)`;
}

export type GeneratedDocRow = {
  id: string;
  title: string;
  type: string;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

export type ReviewRow = {
  id: string;
  fileName: string;
  summary: string;
  findingsCount: number;
  recommendationsCount: number;
  costUsd: number;
  createdAt: string | null;
  owner: { name: string | null; email: string | null } | null;
};

export type FeedbackRow = {
  id: string;
  rating: number | null;
  message: string;
  createdAt: string | null;
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

type AdminSection =
  | "overview" | "users" | "consultations" | "documents" | "reviews" | "feedback"
  | "files" | "cms" | "theme" | "plans" | "custom-plan-rates" | "features" | "database";

export function AdminDashboard({
  initialUploads,
  initialUsers,
  initialConsultations,
  initialGeneratedDocs,
  initialReviews,
  initialFeedback,
  currentUserId,
}: {
  initialUploads: UploadRow[];
  initialUsers: UserRow[];
  initialConsultations: ConsultationRow[];
  initialGeneratedDocs: GeneratedDocRow[];
  initialReviews: ReviewRow[];
  initialFeedback: FeedbackRow[];
  currentUserId: string;
}) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV: { group: string; items: { id: AdminSection; label: string; icon: LucideIcon; count?: number }[] }[] = [
    {
      group: "მთავარი",
      items: [
        { id: "overview", label: "მიმოხილვა", icon: BarChart3 },
        { id: "users", label: "მომხმარებლები", icon: Users, count: initialUsers.length },
        { id: "consultations", label: "კონსულტაციები", icon: MessagesSquare, count: initialConsultations.length },
        { id: "documents", label: "დოკუმენტები", icon: FileText, count: initialGeneratedDocs.length },
        { id: "reviews", label: "მიმოხილვები", icon: FileSearch, count: initialReviews.length },
        { id: "feedback", label: "შეფასებები", icon: Star, count: initialFeedback.length },
        { id: "files", label: "ფაილები", icon: ImageIcon, count: initialUploads.length },
      ],
    },
    {
      group: "მართვა",
      items: [
        { id: "cms", label: "შინაარსი (CMS)", icon: LayoutDashboard },
        { id: "theme", label: "თემა", icon: Palette },
        { id: "plans", label: "გეგმები", icon: CreditCard },
        { id: "custom-plan-rates", label: "ინდ. პაკეტის ფასები", icon: SlidersHorizontal },
        { id: "features", label: "ფუნქციები", icon: ToggleRight },
        { id: "database", label: "ბაზა", icon: Database },
      ],
    },
  ];

  const items = NAV.flatMap((g) => g.items);
  const active = items.find((i) => i.id === section) ?? items[0];

  function navList(onNavigate?: () => void) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center gap-2.5 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground ring-1 ring-gold/40">
            <Scale className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">ადმინ პანელი</div>
            <div className="text-xs text-muted-foreground">მართვა</div>
          </div>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-2">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === section;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSection(item.id);
                          onNavigate?.();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-gold" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {typeof item.count === "number" && (
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {item.count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    );
  }

  let content: React.ReactNode = null;
  switch (section) {
    case "overview": content = <OverviewPanel />; break;
    case "users": content = <UsersTable initial={initialUsers} currentUserId={currentUserId} />; break;
    case "consultations": content = <ConsultationsTable initial={initialConsultations} />; break;
    case "documents": content = <GeneratedDocsTable initial={initialGeneratedDocs} />; break;
    case "reviews": content = <ReviewsTable initial={initialReviews} />; break;
    case "feedback": content = <FeedbackTable initial={initialFeedback} />; break;
    case "files": content = <UploadsTable initial={initialUploads} />; break;
    case "cms": content = <CMSPanel />; break;
    case "theme": content = <ThemePanel />; break;
    case "plans": content = <PlansPanel />; break;
    case "custom-plan-rates": content = <CustomPlanRatesPanel />; break;
    case "features": content = <FeaturesPanel />; break;
    case "database": content = <DatabasePanel />; break;
  }

  return (
    <div className="flex min-h-[70vh] overflow-hidden rounded-xl border bg-card">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        {navList()}
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center gap-3 border-b px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="md:hidden" aria-label="მენიუ" />}
            >
              <Menu className="h-4 w-4 text-gold" />
            </SheetTrigger>
            <SheetContent side="left" className="!w-64 gap-0 bg-sidebar p-0 text-sidebar-foreground">
              <SheetTitle className="sr-only">ნავიგაცია</SheetTitle>
              {navList(() => setMobileOpen(false))}
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">{active.label}</h1>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6">{content}</div>
      </div>
    </div>
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
            <th>ვადა</th>
            <th>კონს.</th>
            <th>დოკ.გ</th>
            <th>მიმ.</th>
            <th>AI ხარჯი</th>
            <th>რეგ.</th>
            <th className="text-right">ქმედება</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && (
            <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">მომხმარებლები არ არის</td></tr>
          )}
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </td>
              <td><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></td>
              <td>{u.plan}</td>
              <td className="text-muted-foreground">{u.planExpiresAt ? formatDate(u.planExpiresAt) : "—"}</td>
              <td>{u.consultationsRemaining}</td>
              <td>{u.docGenerationRemaining}</td>
              <td>{u.docReviewRemaining}</td>
              <td className="text-muted-foreground">{formatCostUsd(u.totalAiCostUsd)}</td>
              <td className="text-muted-foreground">{formatDate(u.createdAt)}</td>
              <td>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(u)} aria-label="რედაქტირება">
                    <Pencil className="h-4 w-4 text-gold" />
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
  const [plan, setPlan] = useState<string>("free");
  const [durationMonths, setDurationMonths] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncedId, setSyncedId] = useState<string | null>(null);
  const [planOptions, setPlanOptions] = useState<{ key: string; name: string }[]>([]);

  React.useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) setPlanOptions(data.map((p: { key: string; name: string }) => ({ key: p.key, name: p.name })));
      })
      .catch(() => {});
  }, []);

  if (user && user.id !== syncedId) {
    setSyncedId(user.id);
    setName(user.name);
    setRole(user.role);
    setPlan(user.plan);
    setDurationMonths("");
  }

  const isFreePlan = plan === "free";
  const durationValid = isFreePlan || (Number(durationMonths) >= 1 && Number.isInteger(Number(durationMonths)));

  async function save() {
    if (!user || !durationValid) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          plan,
          ...(isFreePlan ? {} : { planDurationMonths: Number(durationMonths) }),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? "შენახვა ვერ მოხერხდა"); return; }
      toast.success("შენახულია — გეგმის ლიმიტები განახლდა");
      onSaved({
        ...user,
        name: data.name,
        role: data.role,
        plan: data.plan,
        consultationsRemaining: data.consultationsRemaining,
        docGenerationRemaining: data.docGenerationRemaining,
        docReviewRemaining: data.docReviewRemaining,
        docTemplatesRemaining: data.docTemplatesRemaining,
        planExpiresAt: data.planExpiresAt,
      });
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
        {user && (
          <p className="text-xs text-muted-foreground">
            სულ AI ხარჯი: <span className="font-medium text-foreground">{formatCostUsd(user.totalAiCostUsd)}</span>
          </p>
        )}
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
            <select id="edit-plan" value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm">
              {planOptions.length === 0 && <option value={plan}>{plan}</option>}
              {planOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">გეგმის შენახვისას ავტომატურად მიენიჭება ამ გეგმის სრული ლიმიტები (კონსულტაცია, დოკ. გენერაცია, მიმოხილვა, შაბლონები).</p>
          </div>
          {!isFreePlan && (
            <div className="grid gap-2">
              <Label htmlFor="edit-duration">ხანგრძლივობა (თვე) *</Label>
              <Input
                id="edit-duration"
                type="number"
                min={1}
                step={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                placeholder="მაგ. 1"
              />
              {!durationValid && durationMonths !== "" && (
                <p className="text-xs text-destructive">მიუთითეთ თვეების მთელი რიცხვი (მინ. 1).</p>
              )}
              {durationValid && durationMonths !== "" && (
                <p className="text-xs text-muted-foreground">
                  გეგმა გაუქმდება ავტომატურად და დაბრუნდება Free-ზე{" "}
                  <span className="font-medium text-foreground">
                    {(() => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + Number(durationMonths));
                      return d.toLocaleDateString("ka-GE");
                    })()}
                  </span>
                  -ს (შენახვის მომენტიდან +{durationMonths} თვე), თუ მანამდე არ გააგრძელებთ ან არ შეცვლით.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={save} disabled={saving || !durationValid}>{saving ? "ინახება..." : "შენახვა"}</Button>
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
            <th>მოდელი</th>
            <th>ღირებულება</th>
            <th>თარიღი</th>
            <th className="text-right">პასუხი</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">კონსულტაციები არ არის</td></tr>
          )}
          {initial.map((c) => (
            <React.Fragment key={c.id}>
              <tr className="border-b [&>td]:px-4 [&>td]:py-3">
                <td className="max-w-[280px]">
                  <div className="truncate font-medium">{c.question}</div>
                </td>
                <td>
                  <div className="text-xs">
                    <div>{c.owner?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{c.owner?.email ?? ""}</div>
                  </div>
                </td>
                <td>
                  {c.modelTier ? (
                    <span className="rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatModelTier(c.modelTier)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">უცნობი (ძველი ჩანაწერი)</span>
                  )}
                </td>
                <td className="text-muted-foreground">{formatCostUsd(c.costUsd)}</td>
                <td className="text-muted-foreground">{formatDate(c.createdAt)}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    {expanded === c.id ? "დახურვა" : "ნახვა"}
                  </Button>
                </td>
              </tr>
              {expanded === c.id && (
                <tr key={`${c.id}-exp`} className="border-b bg-muted/20">
                  <td colSpan={6} className="px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{c.answer}</p>
                  </td>
                </tr>
              )}
            </React.Fragment>
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
            <th>ღირებულება</th>
            <th>მომხმარებელი</th>
            <th>თარიღი</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">დოკუმენტები არ არის</td></tr>
          )}
          {initial.map((d) => (
            <tr key={d.id} className="border-b last:border-0 [&>td]:px-4 [&>td]:py-3">
              <td className="max-w-[260px] truncate font-medium">{d.title}</td>
              <td>
                <Badge variant="secondary" className="text-xs">
                  {DOC_TYPES[d.type as keyof typeof DOC_TYPES] ?? d.type}
                </Badge>
              </td>
              <td className="text-muted-foreground">{formatCostUsd(d.costUsd)}</td>
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
            <th>ღირებულება</th>
            <th>თარიღი</th>
            <th className="text-right">შეჯამება</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">მიმოხილვები არ არის</td></tr>
          )}
          {initial.map((r) => (
            <React.Fragment key={r.id}>
              <tr className="border-b [&>td]:px-4 [&>td]:py-3">
                <td className="max-w-[180px] truncate font-medium">{r.fileName}</td>
                <td>
                  <div className="text-xs">
                    <div>{r.owner?.name ?? "—"}</div>
                    <div className="text-muted-foreground">{r.owner?.email ?? ""}</div>
                  </div>
                </td>
                <td>{r.findingsCount}</td>
                <td>{r.recommendationsCount}</td>
                <td className="text-muted-foreground">{formatCostUsd(r.costUsd)}</td>
                <td className="text-muted-foreground">{formatDate(r.createdAt)}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    {expanded === r.id ? "დახურვა" : "ნახვა"}
                  </Button>
                </td>
              </tr>
              {expanded === r.id && (
                <tr key={`${r.id}-exp`} className="border-b bg-muted/20">
                  <td colSpan={7} className="px-4 py-3">
                    <p className="text-sm leading-relaxed">{r.summary}</p>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------- Feedback -------------------------------- */

function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= rating ? "fill-gold text-gold" : "fill-none text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

function FeedbackTable({ initial }: { initial: FeedbackRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-muted-foreground">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-medium">
            <th>შეფასება</th>
            <th>შეტყობინება</th>
            <th>თარიღი</th>
            <th className="text-right">ქმედება</th>
          </tr>
        </thead>
        <tbody>
          {initial.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">შეფასებები არ არის</td></tr>
          )}
          {initial.map((f) => (
            <React.Fragment key={f.id}>
              <tr className="border-b [&>td]:px-4 [&>td]:py-3">
                <td><StarRating rating={f.rating} /></td>
                <td className="max-w-[320px] truncate text-muted-foreground">{f.message || "—"}</td>
                <td className="text-muted-foreground">{formatDate(f.createdAt)}</td>
                <td className="text-right">
                  {f.message && (
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>
                      {expanded === f.id ? "დახურვა" : "ნახვა"}
                    </Button>
                  )}
                </td>
              </tr>
              {expanded === f.id && (
                <tr key={`${f.id}-exp`} className="border-b bg-muted/20">
                  <td colSpan={4} className="px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{f.message}</p>
                  </td>
                </tr>
              )}
            </React.Fragment>
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
                      <ImageIcon className="h-4 w-4 text-gold" />
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
                    <ExternalLink className="h-4 w-4 text-gold" />
                  </a>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(f)} aria-label="შენიშვნა">
                    <Pencil className="h-4 w-4 text-gold" />
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
