# Page Consistency Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring About, Services, Legislation, Blog, Terms, Privacy, Disclaimer, and Chat pages to the same design standard as the Home page — shared PageHero component, design tokens replacing hardcoded hex, AnimateIn animations, card-hover and btn-hover micro-interactions.

**Architecture:** One new shared `PageHero` server component (`src/components/site/PageHero.tsx`) is the foundation. Each page is then edited independently — no cross-page logic coupling. All changes are purely presentational (CSS classes + AnimateIn wrappers); no data, API, or business logic changes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Lucide icons, existing `AnimateIn` component at `src/components/site/AnimateIn.tsx`.

## Global Constraints

- No test runner — verify each task with `npm run lint` (zero new errors) and visual check in dev server at `localhost:3000`.
- Never introduce hardcoded hex colors — always use design tokens (`text-primary`, `bg-primary`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary/10`, `bg-muted/40`, `text-gold`).
- `AnimateIn` is a client component at `src/components/site/AnimateIn.tsx` — import it in server components freely (Next.js handles the boundary).
- `PageHero` must be a server component (no `"use client"`).
- All card containers use `rounded-2xl`.
- Active clickable cards: `border-t-[3px] border-t-primary`.
- Coming-soon / disabled cards: `border-t-[3px] border-t-border opacity-60`.
- Card hover: add class `card-hover` (defined in `globals.css`).
- Button hover: add class `btn-hover` (defined in `globals.css`).
- `h1`, `h2`, `h3` render in serif font automatically via `globals.css` `@layer base` rule.

---

### Task 1: Create PageHero shared component

**Files:**
- Create: `src/components/site/PageHero.tsx`

**Interfaces:**
- Produces: `PageHero({ title: string, subtitle?: string }): JSX.Element` — used by Tasks 2, 3, 5, 6, 7, 8.

- [ ] **Step 1: Create the file**

```tsx
// src/components/site/PageHero.tsx

export function PageHero({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <section className="bg-primary">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white animate-fade-up leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xl text-gold mt-3 font-semibold animate-fade-up delay-150 leading-snug max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/PageHero.tsx
git commit -m "feat: add PageHero shared component"
```

---

### Task 2: Redesign About page

**Files:**
- Modify: `src/app/about/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`, `AnimateIn` from `@/components/site/AnimateIn`.

- [ ] **Step 1: Rewrite `src/app/about/page.tsx`**

Replace the entire file content with:

```tsx
import type { Metadata } from 'next'
import { getAboutPage } from '@/lib/cms'
import { getLocale } from '@/lib/i18n/locale'
import { getDict } from '@/lib/i18n/dictionaries'
import { Users } from 'lucide-react'
import Image from 'next/image'
import { PageHero } from '@/components/site/PageHero'
import { AnimateIn } from '@/components/site/AnimateIn'

export const metadata: Metadata = {
  title: 'ჩვენ შესახებ | ჩემი იურისტი',
  description: 'ჩემი იურისტი - თანამედროვე იურიდიული პლატფორმა, რომელიც სამართალს ხელმისაწვდომს ხდის ყველასთვის.',
}

function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  return (
    <>
      {text.split('\n\n').map((p, i) => (
        <p key={i} className={'leading-relaxed mb-4 last:mb-0 ' + className}>
          {p}
        </p>
      ))}
    </>
  )
}

export default async function AboutPage() {
  const locale = await getLocale()
  const cms = await getAboutPage(locale)
  const d = getDict(locale).about

  const title = cms?.title || d.title
  const intro = cms?.intro || d.intro
  const historyTitle = cms?.historyTitle || d.historyTitle
  const historyBody = cms?.historyBody || d.historyBody
  const missionTitle = cms?.missionTitle || d.missionTitle
  const mission = cms?.mission || d.mission
  const team = [...(cms?.team ?? [])].sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHero title={title} />

      {/* INTRO */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-3xl animate-fade-up delay-150">
        <div className="text-muted-foreground text-lg">
          <Paragraphs text={intro} />
        </div>
      </section>

      {/* HISTORY */}
      <section className="container mx-auto px-4 pb-16 md:pb-20 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 rounded-full bg-primary" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{historyTitle}</h2>
        </div>
        <div className="text-muted-foreground">
          <Paragraphs text={historyBody} />
        </div>
      </section>

      {/* MISSION */}
      <section className="bg-muted/40 border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{missionTitle}</h2>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">{mission}</p>
        </div>
      </section>

      {/* TEAM */}
      {team.length > 0 && (
        <section className="container mx-auto px-4 py-16 md:py-20 max-w-4xl">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">{d.teamTitle}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {team.map((member, idx) => (
              <AnimateIn key={String(member._id)} delay={idx * 80}>
                <div className="flex flex-col items-center text-center gap-3">
                  {member.imageUrl ? (
                    <Image
                      src={member.imageUrl}
                      alt={member.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-2xl font-bold text-primary">
                        {member.name[0] ?? '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: redesign About page to match Home page style"
```

---

### Task 3: Redesign Services page

**Files:**
- Modify: `src/app/services/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`, `AnimateIn` from `@/components/site/AnimateIn`.

- [ ] **Step 1: Rewrite `src/app/services/page.tsx`**

Replace the entire file content with:

```tsx
export const dynamic = "force-dynamic"

import Link from "next/link"
import { MessageSquare, FileText, FolderOpen, ArrowRight, Check } from "lucide-react"
import { getLocale } from "@/lib/i18n/locale"
import { getDict } from "@/lib/i18n/dictionaries"
import { getHomePage } from "@/lib/cms"
import { getHomeSeed } from "@/lib/homepage-defaults"
import { PageHero } from "@/components/site/PageHero"
import { AnimateIn } from "@/components/site/AnimateIn"

type ServiceData = {
  id: string
  icon: typeof MessageSquare
  title: string
  subtitle: string
  description: string
  features: string[]
  cta: string
  href: string
  comingSoon: boolean
}

function getServices(locale: "ka" | "en"): ServiceData[] {
  const isEn = locale === "en"
  return [
    {
      id: "ai-assistant",
      icon: MessageSquare,
      title: isEn ? "AI Lawyer" : "AI იურისტი",
      subtitle: isEn ? "Ask a question" : "დასვით კითხვა",
      description: isEn
        ? "Get instant answers to your legal questions using artificial intelligence, available 24/7. Our AI is trained on Georgian legislation and provides accurate, source-backed answers in plain language."
        : "მიიღეთ მყისიერი პასუხები თქვენს იურიდიულ კითხვებზე ხელოვნური ინტელექტის დახმარებით, 24/7 რეჟიმში. ჩვენი AI გაწვრთნილია საქართველოს კანონმდებლობაზე და გაწვდით ზუსტ, წყაროებით გამყარებულ პასუხებს მარტივად გასაგებ ენაზე.",
      features: isEn
        ? [
            "Instant answers based on Georgian legislation",
            "Official legal source citations",
            "Available 24/7, no appointment needed",
            "Full conversation history saved",
            "Follow-up questions supported",
          ]
        : [
            "მყისიერი პასუხები საქართველოს კანონმდებლობის საფუძველზე",
            "ოფიციალური სამართლებრივი წყაროების ციტირება",
            "ხელმისაწვდომია 24/7, წინასწარი ჩაწერის გარეშე",
            "საუბრის სრული ისტორიის შენახვა",
            "დამატებითი კითხვების დასმის მხარდაჭერა",
          ],
      cta: isEn ? "Ask a question" : "დასვით კითხვა",
      href: "/chat",
      comingSoon: false,
    },
    {
      id: "templates",
      icon: FileText,
      title: isEn ? "Templates" : "შაბლონები",
      subtitle: isEn ? "Create a template" : "შექმენით შაბლონი",
      description: isEn
        ? "Create legal documents quickly and easily by filling out a simple questionnaire. The system automatically prepares a ready-to-use document."
        : "შექმენით იურიდიული დოკუმენტები სწრაფად და მარტივად, მარტივი კითხვარის შევსებით. სისტემა ავტომატურად ამზადებს მზად გამოსაყენებელ დოკუმენტს.",
      features: isEn
        ? [
            "Employment and service contracts",
            "Rental and lease agreements",
            "Power of attorney documents",
            "Step-by-step questionnaire",
            "Download in PDF format",
          ]
        : [
            "შრომითი და მომსახურების ხელშეკრულებები",
            "ქირავნობის და იჯარის შეთანხმებები",
            "მინდობილობის დოკუმენტები",
            "ნაბიჯ-ნაბიჯ კითხვარი",
            "PDF ფორმატში ჩამოტვირთვა",
          ],
      cta: isEn ? "Create Document" : "შექმენით დოკუმენტი",
      href: "/templates",
      comingSoon: true,
    },
    {
      id: "smart-analysis",
      icon: FolderOpen,
      title: isEn ? "Documents" : "დოკუმენტები",
      subtitle: isEn ? "Check a document" : "შეამოწმეთ დოკუმენტი",
      description: isEn
        ? "Upload any document and the system will automatically detect risks and suspicious clauses. Get accurate information before signing a document."
        : "ატვირთეთ ნებისმიერი დოკუმენტი და სისტემა ავტომატურად აღმოაჩენს რისკებსა და საეჭვო პუნქტებს. მიიღეთ ზუსტი ინფორმაცია სანამ ხელს მოაწერთ დოკუმენტს.",
      features: isEn
        ? [
            "Clause-level risk detection",
            "Easy-to-understand risk explanations",
            "Unusual or one-sided terms highlighted",
            "PDF, DOCX and TXT support",
            "Results in under 30 seconds",
          ]
        : [
            "პუნქტების დონეზე რისკების ამოცნობა",
            "მარტივად გასაგები რისკების ახსნა",
            "უჩვეულო ან არათანაბარი პირობების მონიშვნა",
            "PDF, DOCX და TXT მხარდაჭერა",
            "შედეგი 30 წამზე ნაკლებ დროში",
          ],
      cta: isEn ? "Check File" : "ფაილის შემოწმება",
      href: "/docs",
      comingSoon: true,
    },
  ]
}

export default async function ServicesPage() {
  const locale = await getLocale()
  const d = getDict(locale)
  const seed = getHomeSeed()
  const cmsPage = await getHomePage()
  const cmsCards = cmsPage?.serviceCards ?? seed.serviceCards
  const visibleHrefs = new Set(
    cmsCards.filter((c) => c.visible !== false).map((c) => c.href),
  )
  const SERVICES = getServices(locale).filter((s) => visibleHrefs.has(s.href))

  return (
    <div>
      <PageHero title={d.services.title} subtitle={d.services.subtitle} />

      <div className="container mx-auto px-4 py-14 max-w-5xl">
        <div className="flex flex-col gap-6">
          {SERVICES.map((s, idx) => {
            const Icon = s.icon
            if (s.comingSoon) {
              return (
                <AnimateIn key={s.id} delay={idx * 100}>
                  <div className="border-t-[3px] border-t-border bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row gap-8 opacity-60">
                    <div className="shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-8 w-8 text-primary/30" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h2 className="text-2xl font-bold leading-snug text-foreground">{s.title}</h2>
                          <p className="text-sm font-semibold mt-0.5 text-primary/50">{s.subtitle}</p>
                        </div>
                        <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground border border-border rounded-full px-3 py-1 shrink-0">
                          {d.services.comingSoon}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-3 leading-relaxed">{s.description}</p>
                      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {s.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary/30" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </AnimateIn>
              )
            }
            return (
              <AnimateIn key={s.id} delay={idx * 100}>
                <div className="border-t-[3px] border-t-primary bg-card border border-border rounded-2xl p-8 flex flex-col sm:flex-row gap-8 card-hover group">
                  <div className="shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-snug text-foreground">{s.title}</h2>
                    <p className="text-sm font-semibold mt-0.5 text-primary">{s.subtitle}</p>
                    <p className="text-muted-foreground mt-3 leading-relaxed">{s.description}</p>
                    <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                      {s.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <Link
                        href={s.href}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl btn-hover"
                      >
                        {s.cta}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/services/page.tsx
git commit -m "feat: redesign Services page to match Home page style"
```

---

### Task 4: Redesign Legislation client component

**Files:**
- Modify: `src/app/legislation/legislation-client.tsx`

- [ ] **Step 1: Update card styles in legislation-client.tsx**

Replace the `<a>` card element (currently lines 70-89) with:

```tsx
<a
  key={doc.id}
  href={doc.url}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-start gap-4 bg-card border border-border rounded-2xl px-6 py-7 card-hover transition-all"
>
  <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
    <BookOpen className="h-6 w-6 text-primary" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="font-bold text-primary leading-snug">{doc.title[locale]}</p>
    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{doc.description[locale]}</p>
    <Badge variant="secondary" className="mt-3 text-xs">
      {categories.find((c) => c.id === doc.tagId)?.label ?? doc.tagId}
    </Badge>
  </div>
</a>
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/legislation/legislation-client.tsx
git commit -m "feat: redesign Legislation cards to match Home page style"
```

---

### Task 5: Redesign Blog page

**Files:**
- Modify: `src/app/blog/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`, `AnimateIn` from `@/components/site/AnimateIn`.

- [ ] **Step 1: Rewrite `src/app/blog/page.tsx`**

Replace entire file content with:

```tsx
import type { Metadata } from "next"
import { getPublishedBlogPosts } from "@/lib/cms"
import { getLocale } from "@/lib/i18n/locale"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHero } from "@/components/site/PageHero"
import { AnimateIn } from "@/components/site/AnimateIn"

export const metadata: Metadata = {
  title: "ბლოგი | ჩემი იურისტი",
  description: "სამართლებრივი სიახლეები და სტატიები",
}

export default async function BlogPage() {
  const locale = await getLocale()
  const posts = await getPublishedBlogPosts(locale)

  return (
    <div>
      <PageHero title="ბლოგი" subtitle="სამართლებრივი სიახლეები და სტატიები" />

      <section className="container mx-auto max-w-4xl px-4 py-14">
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">პოსტები არ არის.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post, idx) => (
              <AnimateIn key={post._id?.toString()} delay={idx * 60}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="bg-card border border-border border-t-[3px] border-t-primary rounded-2xl p-6 flex flex-col gap-3 card-hover group h-full"
                >
                  <p className="font-bold text-foreground leading-snug">{post.title}</p>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  )}
                  <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
                    წაიკითხეთ <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </AnimateIn>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/blog/page.tsx
git commit -m "feat: redesign Blog page to match Home page style"
```

---

### Task 6: Redesign Terms page

**Files:**
- Modify: `src/app/terms/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`.

- [ ] **Step 1: Rewrite `src/app/terms/page.tsx`**

Replace entire file content with:

```tsx
import type { Metadata } from "next"
import { PageHero } from "@/components/site/PageHero"

export const metadata: Metadata = {
  title: "მომსახურების პირობები | ჩემი იურისტი",
  description: "ჩემი იურისტის მომსახურების პირობები",
}

export default function TermsPage() {
  return (
    <div>
      <PageHero title="მომსახურების პირობები" />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 animate-fade-up delay-150 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            „ჩემი იურისტი&rdquo; წარმოადგენს ხელოვნურ ინტელექტზე დაფუძნებულ საინფორმაციო
            პლატფორმას, რომელიც აწვდის მომხმარებელს კანონმდებლობაზე დაფუძნებულ
            გენერირებულ პასუხებს, იურიდიულ ანალიზს და დოკუმენტების შაბლონებს.
          </p>
          <p>
            პლატფორმა არ წარმოადგენს ადვოკატურ ბიუროს, იურიდიულ წარმომადგენელს ან
            სახელმწიფო ორგანოს და არ ახორციელებს ოფიციალურ სამართლებრივ მომსახურებას.
          </p>
          <p>
            სერვისის გამოყენება შესაძლებელია მხოლოდ წინამდებარე პირობების მიღების
            საფუძველზე. პლატფორმას შეუძლია დააწესოს სერვისის გამოყენების ტექნიკური ან
            რაოდენობრივი ლიმიტები.
          </p>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/terms/page.tsx
git commit -m "feat: redesign Terms page to match Home page style"
```

---

### Task 7: Redesign Privacy page

**Files:**
- Modify: `src/app/privacy/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`.

- [ ] **Step 1: Rewrite `src/app/privacy/page.tsx`**

Replace entire file content with:

```tsx
import type { Metadata } from "next"
import { PageHero } from "@/components/site/PageHero"

export const metadata: Metadata = {
  title: "კონფიდენციალურობის პოლიტიკა | ჩემი იურისტი",
  description: "ჩემი იურისტის კონფიდენციალურობის პოლიტიკა",
}

export default function PrivacyPage() {
  return (
    <div>
      <PageHero title="კონფიდენციალურობის პოლიტიკა" />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 animate-fade-up delay-150 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            მომხმარებლის მონაცემები გამოიყენება მხოლოდ სერვისის მიწოდების, სისტემის
            გაუმჯობესებისა და სამართლებრივი ანალიზის მიზნით.
          </p>
          <p>
            მონაცემები არ გადაეცემა მესამე პირებს კომერციული მიზნებით, გარდა სერვისის
            ფუნქციონირებისთვის აუცილებელი ტექნიკური პროვაიდერებისა.
          </p>
          <p>
            მომხმარებელს უფლება აქვს მოითხოვოს საკუთარ მონაცემებზე წვდომა, მათი
            ცვლილება ან წაშლა მოქმედი კანონმდებლობის შესაბამისად.
          </p>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/privacy/page.tsx
git commit -m "feat: redesign Privacy page to match Home page style"
```

---

### Task 8: Redesign Disclaimer page

**Files:**
- Modify: `src/app/disclaimer/page.tsx`

**Interfaces:**
- Consumes: `PageHero` from `@/components/site/PageHero`.

- [ ] **Step 1: Rewrite `src/app/disclaimer/page.tsx`**

Replace entire file content with:

```tsx
import type { Metadata } from "next"
import { PageHero } from "@/components/site/PageHero"

export const metadata: Metadata = {
  title: "პასუხისმგებლობის შეზღუდვა | ჩემი იურისტი",
  description: "ჩემი იურისტის პასუხისმგებლობის შეზღუდვა",
}

export default function DisclaimerPage() {
  return (
    <div>
      <PageHero title="პასუხისმგებლობის შეზღუდვა" />
      <section className="container mx-auto max-w-3xl px-4 py-12">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 animate-fade-up delay-150 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            პლატფორმის მიერ გენერირებული ინფორმაცია წარმოადგენს ავტომატურ, ხელოვნურ
            ინტელექტზე დაფუძნებულ შედეგს და ემყარება მოქმედ კანონმდებლობას.
          </p>
          <p>
            მოწოდებული ინფორმაცია არ წარმოადგენს ოფიციალურ იურიდიულ დასკვნას,
            პროფესიულ რჩევას ან ადვოკატურ მომსახურებას.
          </p>
          <p>
            პლატფორმა არ აგებს პასუხს მომხმარებლის მიერ მიღებულ გადაწყვეტილებებზე
            ან მათი გამოყენების შედეგად დამდგარ შედეგებზე.
          </p>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/disclaimer/page.tsx
git commit -m "feat: redesign Disclaimer page to match Home page style"
```

---

### Task 9: Polish Chat page

**Files:**
- Modify: `src/app/chat/chat-client.tsx`

- [ ] **Step 1: Apply animation + card styling in chat-client.tsx**

Make these targeted changes:

**1. Intro block** — add `animate-fade-up` class to the outer div (line 141–146):
```tsx
<div className="mb-6 flex flex-col gap-3 animate-fade-up">
```

**2. Assistant message Card** — add `border-t-[3px] border-t-primary` (inside the messages map, the assistant branch Card element):
```tsx
<Card className={["flex-1", m.role === "assistant" ? "border-t-[3px] border-t-primary" : ""].join(" ").trim()}>
```

**3. Sticky input form wrapper** — wrap the entire `<form>` in a styled container. Replace:
```tsx
<form
  className="sticky bottom-4 flex flex-col gap-2"
  ...
>
```
with:
```tsx
<form
  className="sticky bottom-4 flex flex-col gap-2 bg-background/95 backdrop-blur-sm rounded-2xl border border-border p-3 shadow-sm"
  ...
>
```
Remove the inner `<div className="flex gap-2">` label wrapper's margin — it now lives inside the padded form.

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/chat/chat-client.tsx
git commit -m "feat: polish Chat page animations and card styling"
```

---

## Execution Order

Tasks are independent after Task 1 (PageHero must exist before Tasks 2, 3, 5, 6, 7, 8 can use it). Task 4 and Task 9 are fully independent — they can run in parallel with any other task after Task 1.

Recommended order: 1 → 2, 3, 4, 5, 6, 7, 8, 9 (tasks 2-9 can all run concurrently after task 1).
