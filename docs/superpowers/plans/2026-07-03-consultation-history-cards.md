# Consultation History Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn consultation history into a "service module" like Documents/Reviews — a small link-tile on the dashboard, and a clickable card grid with a detail modal on its own page — replacing today's plain text-row list.

**Architecture:** Two independent file-level changes. (1) `src/app/dashboard/page.tsx` drops its big inline "recent consultations" list card and folds a new small link-tile into the existing Documents/Reviews tile row. (2) `src/app/dashboard/consultations/page.tsx` stays a server component (data fetch only) but delegates rendering to a new client component `consultations-grid.tsx` that renders a card grid and opens a `Dialog` with full Q&A + legal-basis detail on click. No new DB fields, no new API routes, no new dynamic routes.

**Tech Stack:** Next.js 16 App Router (Server + Client Components), React 19, TypeScript strict, Tailwind v4, shadcn/ui `Dialog` (base-ui/react), lucide-react icons.

## Global Constraints

- No test runner configured — verify every task with `npm run lint`, `npx tsc --noEmit`, and a manual check in the dev server (`npm run dev`).
- Never introduce hardcoded hex colors — use design tokens (`text-primary`, `bg-card`, `border-border`, `text-muted-foreground`, etc.), consistent with `docs/superpowers/plans/2026-06-27-page-consistency-redesign.md`.
- Card containers use `rounded-2xl`. Active clickable tiles use `border-t-[3px] border-t-primary`. Hover uses class `card-hover` (defined in `globals.css`).
- Usage deduction (`consultationsRemaining`) and the "used/remaining" display on the Package Limits card are already correct — do not touch `src/app/api/chat/route.ts` or the `UsageRow` component in this plan.
- Treat each `Consultation` document as its own "session" card — no new `sessionId`/session-grouping data model in this plan (per design doc `docs/superpowers/specs/2026-07-03-consultation-history-cards-design.md`).

---

### Task 1: Dashboard — fold Consultation History into the tile row, drop the inline list

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- No new exports. `DashboardPage` remains the default export with the same signature.

- [ ] **Step 1: Remove the now-unused `Consultation` history fetch**

In `src/app/dashboard/page.tsx`, the current data-fetch block is:

```tsx
  const plan = user.plan ?? "free";
  const [history, planData] = await Promise.all([
    Consultation.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    getPlanByKey(plan),
  ]);
```

Replace it with:

```tsx
  const plan = user.plan ?? "free";
  const planData = await getPlanByKey(plan);
```

- [ ] **Step 2: Drop the now-unused `Consultation`, `Clock`, `Separator` imports**

Change:

```tsx
import { MessagesSquare, FileText, CreditCard, Clock, Search, FileCheck } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Consultation } from "@/lib/models/consultation";
import { Subscription } from "@/lib/models/subscription";
```

to:

```tsx
import { MessagesSquare, FileText, CreditCard, Search, FileCheck } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Subscription } from "@/lib/models/subscription";
```

And change:

```tsx
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPlanByKey } from "@/lib/plans-db";
```

to:

```tsx
import { Badge } from "@/components/ui/badge";
import { getPlanByKey } from "@/lib/plans-db";
```

- [ ] **Step 3: Replace section 3 ("Consultation history" list card) and section 4 (2-tile row) with a single 3-tile row**

Find this block (current section 3 + section 4):

```tsx
      {/* 3. Consultation history */}
      <AnimateIn delay={160}>
      <Card className="mb-8 rounded-2xl border-t-[3px] border-t-primary">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{d.dashboard.recentConsultations}</CardTitle>
            <CardDescription>{d.dashboard.latest5}</CardDescription>
          </div>
          <Link
            href="/dashboard/consultations"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {d.dashboard.viewAll}
          </Link>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {d.dashboard.noHistory}{" "}
              <Link href="/chat" className="underline">
                {d.dashboard.startHere}
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((h, i) => {
                const id = String((h as { _id: unknown })._id);
                const created = (h as { createdAt?: Date }).createdAt;
                return (
                  <div key={id}>
                    <Link
                      href={`/dashboard/consultations#${id}`}
                      className="flex items-start justify-between gap-4 py-2 hover:bg-muted/40 -mx-2 px-2 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{h.question}</div>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        {created ? new Date(created).toLocaleDateString(dateLocale) : ""}
                      </div>
                    </Link>
                    {i < history.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </AnimateIn>

      {/* 4. Generated documents and review results */}
      {(showGenerate || showReview) && (
        <AnimateIn delay={240}>
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          {showGenerate && (
            <Link href="/dashboard/documents">
              <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
                <p className="font-bold text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> {d.dashboard.generatedDocs}
                </p>
                <p className="text-sm text-muted-foreground">{d.dashboard.downloadView}</p>
              </div>
            </Link>
          )}
          {showReview && (
            <Link href="/dashboard/reviews">
              <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
                <p className="font-bold text-base flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" /> {d.dashboard.reviewResults}
                </p>
                <p className="text-sm text-muted-foreground">{d.dashboard.analysisHistory}</p>
              </div>
            </Link>
          )}
        </div>
        </AnimateIn>
      )}
```

Replace it with a single 3-tile row (Consultation History always shown, Documents/Reviews still behind their flags):

```tsx
      {/* 3. Consultation History | Generated Documents | Review Results */}
      <AnimateIn delay={160}>
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Link href="/dashboard/consultations">
          <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
            <p className="font-bold text-base flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-primary" /> {d.dashboard.consultHistory}
            </p>
            <p className="text-sm text-muted-foreground">{d.dashboard.allQnA}</p>
          </div>
        </Link>
        {showGenerate && (
          <Link href="/dashboard/documents">
            <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
              <p className="font-bold text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> {d.dashboard.generatedDocs}
              </p>
              <p className="text-sm text-muted-foreground">{d.dashboard.downloadView}</p>
            </div>
          </Link>
        )}
        {showReview && (
          <Link href="/dashboard/reviews">
            <div className="bg-card border border-border rounded-2xl p-5 card-hover cursor-pointer flex flex-col gap-2">
              <p className="font-bold text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" /> {d.dashboard.reviewResults}
              </p>
              <p className="text-sm text-muted-foreground">{d.dashboard.analysisHistory}</p>
            </div>
          </Link>
        )}
      </div>
      </AnimateIn>
```

Note this is now the last section in the page — remove the trailing blank line/comment mismatch so the file still ends with:

```tsx
    </div>
    </div>
  );
}
```

- [ ] **Step 4: Lint and type-check**

Run: `npm run lint`
Expected: no new errors (in particular, no `no-unused-vars` on `Consultation`, `Clock`, `Separator`, `history`).

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npm run dev`, sign in, visit `/dashboard`. Confirm order top-to-bottom: Package Limits card, 3-card services row (Consultation/Documents/Review), 3-card row (Consultation History/Documents/Review — Documents/Review tiles only shown if the plan/flags enable them). Click "Consultation History" tile — confirm it navigates to `/dashboard/consultations`.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: fold consultation history into dashboard tile row"
```

---

### Task 2: Consultation history page — card grid with detail modal

**Files:**
- Create: `src/app/dashboard/consultations/consultations-grid.tsx`
- Modify: `src/app/dashboard/consultations/page.tsx`

**Interfaces:**
- Produces: `ConsultationsGrid({ items: ConsultationItem[] }): JSX.Element`, exported `type ConsultationItem = { id: string; question: string; answer: string; createdAt: string | null; sources: RawSource[] }` from `consultations-grid.tsx` — the server page constructs this shape from its Mongoose query result.

- [ ] **Step 1: Create the client component**

Create `src/app/dashboard/consultations/consultations-grid.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { groupItemsByArticle, type LegalBasisItem } from "@/lib/legal/citations";
import { renderMarkdownBold } from "@/lib/markdown-bold";

export type RawSource = {
  title?: string;
  url?: string;
  article?: string;
  paragraph?: string;
  subparagraph?: string;
  /** Legacy: consultations saved before article/paragraph/subparagraph existed. */
  articleNumber?: string;
};

export type ConsultationItem = {
  id: string;
  question: string;
  answer: string;
  createdAt: string | null;
  sources: RawSource[];
};

type SourceGroup = {
  lawName: string;
  url?: string;
  articleGroups: Array<{ article: string; points: string[] }>;
};

/**
 * Same grouping the live chat view uses (groupItemsByArticle), so the history
 * view renders identical "Legal Basis" text for the same underlying data
 * instead of its own re-derivation.
 */
function groupSources(sources: RawSource[]): SourceGroup[] {
  const groups = new Map<string, { lawName: string; url?: string; items: LegalBasisItem[] }>();
  for (const s of sources) {
    const key = `${s.title ?? ""}|${s.url ?? ""}`;
    let g = groups.get(key);
    if (!g) {
      g = { lawName: s.title ?? "", url: s.url, items: [] };
      groups.set(key, g);
    }
    if (s.article) {
      g.items.push({
        article: s.article,
        paragraph: s.paragraph ?? null,
        subparagraph: s.subparagraph ?? null,
      });
    } else {
      g.items.push({ article: s.articleNumber ?? s.title ?? "", paragraph: null, subparagraph: null });
    }
  }
  return [...groups.values()].map((g) => ({
    lawName: g.lawName,
    url: g.url,
    articleGroups: groupItemsByArticle(g.items),
  }));
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("ka-GE") : "";
}

export function ConsultationsGrid({ items }: { items: ConsultationItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = items.find((it) => it.id === openId) ?? null;

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">ჯერ კონსულტაცია არ გაქვს.</p>
          <Link href="/chat" className={buttonVariants()}>
            დაიწყე კონსულტაცია
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenId(item.id)}
            className="text-left border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-5 card-hover h-full flex flex-col gap-3"
          >
            <p className="text-sm font-semibold leading-snug line-clamp-2">{item.question}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
              <Clock className="h-3 w-3" /> {formatDate(item.createdAt)}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(next) => !next && setOpenId(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{active.question}</span>
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(active.createdAt)}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {renderMarkdownBold(active.answer)}
              </p>
              {active.sources.length > 0 && (
                <div className="mt-1 space-y-3 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">
                    იურიდიული საფუძველი:
                  </p>
                  {groupSources(active.sources).map((g, i) => (
                    <div key={`${g.url ?? ""}|${i}`} className="space-y-1">
                      <p className="text-xs font-medium">{g.lawName}:</p>
                      <ul className="ml-1 space-y-0.5">
                        {g.articleGroups.map(({ article, points }) => (
                          <li key={article} className="text-xs text-muted-foreground">
                            {article}
                            {points.length > 1 && <>, პუნქტები: {points.join("; ")}</>}
                            {points.length === 1 && <>, პუნქტი: {points[0]}</>}
                          </li>
                        ))}
                      </ul>
                      {g.url && (
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                        >
                          <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>წყარო</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Simplify the server page to fetch + serialize + delegate**

Replace the full contents of `src/app/dashboard/consultations/page.tsx` with:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { buttonVariants } from "@/components/ui/button";
import { ConsultationsGrid, type ConsultationItem } from "./consultations-grid";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/consultations");

  await dbConnect();
  const docs = await Consultation.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const items: ConsultationItem[] = docs.map((doc) => {
    const d = doc as unknown as {
      _id: unknown;
      question: string;
      answer: string;
      createdAt?: Date;
      sources?: ConsultationItem["sources"];
    };
    return {
      id: String(d._id),
      question: d.question,
      answer: d.answer,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      sources: d.sources ?? [],
    };
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">კონსულტაციების ისტორია</h1>
          <p className="text-sm text-muted-foreground">{items.length} კონსულტაცია</p>
        </div>
      </div>

      <ConsultationsGrid items={items} />
    </div>
  );
}
```

Note the page's `max-w-3xl` becomes `max-w-5xl` here since a grid needs more horizontal room than the old single-column list (matches the `max-w-5xl` container already used on `/dashboard`).

- [ ] **Step 3: Lint and type-check**

Run: `npm run lint`
Expected: no new errors.

Run: `npx tsc --noEmit`
Expected: no errors. Pay attention to the `sources` type — `ConsultationItem["sources"]` must structurally match what `Consultation.lean()` returns (optional `title`/`url`/`article`/`paragraph`/`subparagraph`/`articleNumber` strings); if `tsc` complains about the `sources` cast, use `as RawSource[]` explicitly instead of relying on inference (import `RawSource` from `./consultations-grid` in that case).

- [ ] **Step 4: Manual check**

Run: `npm run dev`, sign in, visit `/dashboard/consultations`.
- With at least one prior consultation: confirm a responsive card grid renders (2 columns on tablet, 3 on desktop), each card shows a truncated question and date.
- Click a card: confirm a modal opens showing the full question, full answer (bold spans rendered as `<strong>`, not literal `**`), and — if that consultation had sources — a "იურიდიული საფუძველი" section with law name, article/point list, and a source link that opens in a new tab.
- Close the modal (X button or backdrop click), click a different card, confirm it shows that card's own data (not stale from the previous card).
- With zero consultations (a fresh test user): confirm the empty-state card with "დაიწყე კონსულტაცია" CTA still renders instead of an empty grid.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/consultations/page.tsx src/app/dashboard/consultations/consultations-grid.tsx
git commit -m "feat: consultation history card grid with detail modal"
```

---

## Execution Order

Task 1 and Task 2 touch disjoint files and have no shared interface — they can be done in either order or in parallel. Recommended order: Task 1 first (quick, small blast radius), then Task 2 (larger, new component).
