# Typography Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a single unified h1 and gold-subtitle class standard across every page so heading size, weight, and line-height are identical site-wide.

**Architecture:** Pure class-string surgery — no new components, no new files, no logic changes. Each task targets one file, replaces the divergent Tailwind classes, and verifies via lint + build.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, TypeScript strict.

## Global Constraints

- h1 standard: `text-5xl md:text-6xl font-bold text-white leading-tight`
- Gold subtitle standard: `text-xl font-semibold text-gold leading-snug`
- Font family handled by global CSS rule (`h1,h2,h3 { font-family: var(--font-noto-serif) }`) — do NOT add font-family Tailwind classes
- Animation classes (`animate-fade-up`, `delay-150`) and spacing classes (`mt-3`, `mb-5`, `max-w-2xl`) are NOT typography — leave them unchanged
- No test runner — verification is `npm run lint` + `npm run build` (both must pass clean)

---

### Task 1: PageHero component — h1 size up

**Files:**
- Modify: `src/components/site/PageHero.tsx:11`

**Current line 11:**
```tsx
<h1 className="text-4xl md:text-5xl font-bold text-white animate-fade-up leading-tight">
```

**Target line 11:**
```tsx
<h1 className="text-5xl md:text-6xl font-bold text-white animate-fade-up leading-tight">
```

- [ ] **Step 1: Apply the change**

In `src/components/site/PageHero.tsx` line 11, replace `text-4xl md:text-5xl` with `text-5xl md:text-6xl`. The full file after edit:

```tsx
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
        <h1 className="text-5xl md:text-6xl font-bold text-white animate-fade-up leading-tight">
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

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/PageHero.tsx
git commit -m "style: standardize PageHero h1 to text-5xl md:text-6xl"
```

---

### Task 2: Home page hero — h1 pixel sizes → standard + remove subtitle size bump

**Files:**
- Modify: `src/app/page.tsx:139,142`

This page uses raw pixel sizes (`text-[58px] sm:text-[68px] lg:text-[76px]`) plus `leading-none tracking-tight whitespace-nowrap` on h1, and adds a responsive `md:text-2xl` bump on the subtitle. Both diverge from the standard.

**Current line 139:**
```tsx
<h1 className="text-[58px] sm:text-[68px] lg:text-[76px] font-bold text-white leading-none tracking-tight mb-5 whitespace-nowrap animate-fade-up">
```

**Target line 139:**
```tsx
<h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-5 animate-fade-up">
```

**Current line 142:**
```tsx
<p className="text-xl md:text-2xl font-semibold text-gold leading-snug animate-fade-up delay-150">
```

**Target line 142:**
```tsx
<p className="text-xl font-semibold text-gold leading-snug animate-fade-up delay-150">
```

- [ ] **Step 1: Apply h1 change (line 139)**

Replace the entire `className` value on the h1:
- Remove: `text-[58px] sm:text-[68px] lg:text-[76px]`, `leading-none`, `tracking-tight`, `whitespace-nowrap`
- Add: `text-5xl md:text-6xl`, `leading-tight`
- Keep: `font-bold text-white mb-5 animate-fade-up`

Result: `className="text-5xl md:text-6xl font-bold text-white leading-tight mb-5 animate-fade-up"`

- [ ] **Step 2: Apply subtitle change (line 142)**

Remove `md:text-2xl` from the `<p>` className.

Result: `className="text-xl font-semibold text-gold leading-snug animate-fade-up delay-150"`

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: standardize Home hero h1 and gold subtitle to unified typography system"
```

---

### Task 3: About page — `<p>`-as-h1 size up

**Files:**
- Modify: `src/app/about/page.tsx:43`

The About hero uses a `<p>` styled as h1 with white/gold split spans. Only the size classes change — structure and spans are untouched.

**Current line 43:**
```tsx
<p className="text-4xl md:text-5xl font-bold animate-fade-up leading-tight">
```

**Target line 43:**
```tsx
<p className="text-5xl md:text-6xl font-bold animate-fade-up leading-tight">
```

- [ ] **Step 1: Apply the change**

Replace `text-4xl md:text-5xl` with `text-5xl md:text-6xl` on line 43.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "style: standardize About page hero heading to text-5xl md:text-6xl"
```

---

### Task 4: Pricing page — h1 size up + add leading-tight

**Files:**
- Modify: `src/app/pricing/page.tsx:25`

Pricing h1 is missing `leading-tight` entirely, and uses the old smaller size.

**Current line 25:**
```tsx
<h1 className="text-4xl md:text-5xl font-bold">{d.pricing.title}</h1>
```

**Target line 25:**
```tsx
<h1 className="text-5xl md:text-6xl font-bold leading-tight">{d.pricing.title}</h1>
```

- [ ] **Step 1: Apply the change**

Replace `text-4xl md:text-5xl font-bold` with `text-5xl md:text-6xl font-bold leading-tight`.

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

Expected: clean lint, successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "style: standardize Pricing page h1 to unified typography system"
```

---

## Self-Review

**Spec coverage:**
- [x] PageHero h1 standardized → Task 1
- [x] Home h1 pixel sizes replaced → Task 2
- [x] Home subtitle `md:text-2xl` removed → Task 2
- [x] About h1-proxy size updated → Task 3
- [x] Pricing h1 size + leading standardized → Task 4
- [x] Gold subtitle in PageHero already correct (`text-xl font-semibold text-gold leading-snug`) — no change needed ✓

**Placeholder scan:** No TBDs, no vague steps, all code shown.

**Type consistency:** No types involved — pure className string changes.
