# Premium UI & Animation Enhancement — Design Spec

**Date:** 2026-06-27  
**Project:** ჩემი იურისტი (Chemi Iuristi) — Georgian Legal SaaS  
**Scope:** Homepage + site-wide visual polish  

---

## Goals

1. Make the hero image (Kartlis Deda statue) sharper, more vivid, and more impactful.
2. Add a decorative animated SVG scales of justice to the hero (the statue image is a flat PNG — individual elements cannot be animated independently).
3. Upgrade to serif headings for a more authoritative, premium legal aesthetic.
4. Add an animation system (scroll-triggered fade/slide, hover micro-interactions, hero entrance animations) with zero new npm dependencies.
5. Preserve full bilingual (ka/en) and CMS-driven content — no structural changes to data flow.

---

## Constraints

- **No new npm dependencies.** Animations use CSS keyframes + a small `AnimateIn` client component (IntersectionObserver).
- **Phase 1 only.** No backend wiring. No Framer Motion. No canvas.
- **RSC-first.** `page.tsx` stays a Server Component. Only the animation wrapper and PricingSection (already client) get `"use client"`.
- **Georgian font support mandatory.** Typography choices must support Georgian script.
- **`prefers-reduced-motion` respected** — all animations disabled for users who opt out.

---

## 1. Hero Image Enhancement

**File:** `src/app/page.tsx` (hero `<img>` tag)

### Current state
```
opacity-[0.82]
filter: invert(1) sepia(1) saturate(3.5) hue-rotate(8deg) contrast(1.4) brightness(1.12)
```

### Target state
```
opacity-[0.96]
filter: invert(1) sepia(1) saturate(4.2) hue-rotate(6deg) contrast(1.6) brightness(1.08) drop-shadow(0 0 32px oklch(0.65 0.13 78 / 0.35))
```

Changes:
- Opacity raised from 0.82 → 0.96 (removes the "faded" look)
- Saturation increased (3.5 → 4.2) for richer gold
- Contrast increased (1.4 → 1.6) for sharper silhouette
- `drop-shadow` glow added: warm gold halo using the `--gold` color at 35% opacity
- Slow `float` animation applied to the image wrapper (translateY 0 → −8px, 7s ease-in-out infinite)

---

## 2. Scales of Justice — Animated SVG

**Position:** Bottom-right of the hero text column, overlapping slightly into the image zone.  
**Size:** `w-24 h-24` (96px) on mobile, `w-32 h-32` (128px) on lg+.  
**Color:** `text-gold` / `stroke-current`, gold fill.  
**Animation:** `scale-sway` — two pans tilt alternately ±2.5° on a 4s ease-in-out infinite loop.

The SVG is inlined in `page.tsx` (no external file). It consists of:
- A horizontal beam
- A center post
- Two hanging pans (left/right) each in their own `<g>` with `transform-origin` at the beam center
- The left pan animates `rotate(-2.5deg)` → `rotate(2.5deg)`, right pan mirrors

The sway keyframe is split: at 0% left is down, at 50% right is down, at 100% back. This creates the classic balance/justice motion.

The SVG fades in via `animate-fade-up` with a 400ms delay (after hero text).

---

## 3. Typography Upgrade

**File:** `src/app/globals.css`

`Noto_Serif_Georgian` is already imported in `layout.tsx` (variable `--font-noto-serif`) but the `--font-heading` CSS variable currently points to `--font-georgian` (the sans). 

Change in `@theme inline`:
```css
--font-heading: var(--font-noto-serif), Georgia, serif;
```

Add to `@layer base`:
```css
h1, h2, h3 {
  font-family: var(--font-heading);
}
```

Effect: All section headings (hero h1, service/stats/features/pricing h2) render in Noto Serif Georgian — more authoritative and premium for a legal brand.

---

## 4. Animation System

### 4a. Global Keyframes & Utilities

**File:** `src/app/globals.css`

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

@keyframes scale-sway {
  0%, 100% { transform: rotate(-2.5deg); }
  50%       { transform: rotate(2.5deg); }
}

@keyframes scale-sway-mirror {
  0%, 100% { transform: rotate(2.5deg); }
  50%       { transform: rotate(-2.5deg); }
}

@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* Utility classes */
.animate-fade-up    { animation: fade-up 0.6s ease-out both; }
.animate-fade-in    { animation: fade-in 0.5s ease-out both; }
.animate-float      { animation: float 7s ease-in-out infinite; }
.animate-scale-sway { animation: scale-sway 4s ease-in-out infinite; }
.animate-scale-sway-mirror { animation: scale-sway-mirror 4s ease-in-out infinite; }

/* Animation delay utilities */
.delay-150  { animation-delay: 150ms; }
.delay-300  { animation-delay: 300ms; }
.delay-400  { animation-delay: 400ms; }
.delay-500  { animation-delay: 500ms; }
.delay-600  { animation-delay: 600ms; }

/* Reduced motion: disable all animations */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up,
  .animate-fade-in,
  .animate-float,
  .animate-scale-sway,
  .animate-scale-sway-mirror {
    animation: none;
  }
}
```

### 4b. AnimateIn Client Component

**New file:** `src/components/site/AnimateIn.tsx`

A minimal `"use client"` wrapper using `IntersectionObserver`. When the element enters the viewport (threshold 0.12), it adds `data-visible="true"` which triggers a CSS animation via:

```css
[data-animate]:not([data-visible]) { opacity: 0; transform: translateY(16px); }
[data-animate][data-visible]       { animation: fade-up 0.6s ease-out both; }
```

Props:
- `delay?: number` — ms offset for stagger (default 0)
- `className?: string`
- `children: React.ReactNode`

This avoids layout shift because the hidden state uses CSS (not JS-toggled inline styles) and the element reserves its space.

### 4c. Hero Section Animations

Applied in `src/app/page.tsx`:

| Element | Class | Delay |
|---|---|---|
| `<h1>` hero title | `animate-fade-up` | 0ms |
| `<p>` hero subtitle | `animate-fade-up` | 150ms |
| Statue `<div>` wrapper | `animate-fade-in animate-float` | 200ms |
| Scales SVG wrapper | `animate-fade-up` | 400ms |

### 4d. Section Scroll Animations

Sections wrapped with `<AnimateIn>` in `page.tsx`:

- **Service card** — each card individually with `delay={index * 80}ms` stagger
- **Stat card** — each card with `delay={index * 100}ms`
- **Feature card** — each card with `delay={index * 60}ms`

### 4e. Pricing Card Enhancement

**File:** `src/components/site/PricingSection.tsx`

- Each card wrapped in `AnimateIn` with `delay={index * 100}ms`
- Highlighted card badge gets shimmer gradient treatment:
  ```css
  background: linear-gradient(90deg, var(--primary) 0%, oklch(0.55 0.19 264) 50%, var(--primary) 100%);
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
  ```

### 4f. Hover Micro-interactions

> **Note:** Existing Tailwind hover classes on service cards (`hover:shadow-xl hover:shadow-primary/8 hover:-translate-y-1 transition-all`) are **replaced** by `card-hover`. The `group` class and arrow icon hover (`group-hover:translate-x-0.5`) are kept.



Applied globally via CSS in `globals.css`:

**Cards (service, stat, feature, pricing):**
```css
.card-hover {
  transition: transform 250ms ease-out, box-shadow 250ms ease-out, border-color 250ms ease-out;
}
.card-hover:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 8px 32px oklch(0.366 0.165 264 / 0.12);
  border-color: oklch(0.366 0.165 264 / 0.35);
}
```

**Buttons:**
```css
.btn-hover {
  transition: transform 200ms ease-out, box-shadow 200ms ease-out, background-color 200ms ease-out;
}
.btn-hover:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px oklch(0.366 0.165 264 / 0.25);
}
```

**Footer links (underline slide-in):**
```css
.footer-link {
  position: relative;
}
.footer-link::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 0;
  height: 1px;
  background: white;
  transition: width 200ms ease-out;
}
.footer-link:hover::after { width: 100%; }
```

---

## 5. Files Changed

| File | Type | Summary |
|---|---|---|
| `src/app/globals.css` | Modify | Keyframes, animation utilities, heading serif font, hover CSS |
| `src/app/page.tsx` | Modify | Hero filter + float, scales SVG, AnimateIn wrapping, animation classes |
| `src/components/site/PricingSection.tsx` | Modify | AnimateIn wrapping, shimmer badge |
| `src/components/site/footer.tsx` | Modify | Footer link underline hover class |
| `src/components/site/AnimateIn.tsx` | **New** | IntersectionObserver scroll-trigger wrapper |

---

## 6. What This Does NOT Change

- CMS data flow, API routes, MongoDB models
- Header component
- Login / Register / Dashboard / Chat pages
- Any route other than the homepage
- shadcn/ui primitive components
- Tailwind config / `components.json`
- Theme tokens (color palette stays identical)

---

## Out of Scope

- Framer Motion / GSAP (adds bundle weight, deferred to Phase 4 if needed)
- Page transition animations (requires router-level setup)
- Dark mode animation variants (dark mode already works; animations are color-agnostic)
- Number count-up animation for stats (deferred — needs a counter client component, low priority)
