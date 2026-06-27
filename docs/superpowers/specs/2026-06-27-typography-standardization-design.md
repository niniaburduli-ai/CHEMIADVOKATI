# Typography Standardization Design

**Date:** 2026-06-27  
**Status:** Approved

## Goal

Single unified typography system across every page. No per-page heading size drift. All page h1s identical. All gold subtitles identical.

## Current State (Problems)

| File | h1 classes | Issue |
|---|---|---|
| `PageHero.tsx` | `text-4xl md:text-5xl font-bold leading-tight` | Baseline — smallest |
| `app/about/page.tsx` | `text-4xl md:text-5xl font-bold leading-tight` | Matches PageHero but inline |
| `app/pricing/page.tsx` | `text-4xl md:text-5xl font-bold` | Missing `leading-tight` |
| `app/page.tsx` | `text-[58px] sm:text-[68px] lg:text-[76px] font-bold leading-none tracking-tight` | Pixel sizes, wrong leading |

| File | Gold subtitle classes | Issue |
|---|---|---|
| `PageHero.tsx` | `text-xl text-gold font-semibold leading-snug` | Correct size, baseline |
| `app/page.tsx` | `text-xl md:text-2xl font-semibold text-gold leading-snug` | `md:text-2xl` bump — inconsistent |

## Standard (Target)

### Page H1

```
text-5xl md:text-6xl font-bold text-white leading-tight
```

| Property | Value | Tailwind |
|---|---|---|
| Font family | Noto Serif | via global CSS `h1,h2,h3` rule — no class needed |
| Font size | 48px → 60px | `text-5xl md:text-6xl` |
| Font weight | 700 | `font-bold` |
| Line height | 1.25 | `leading-tight` |
| Color | white | `text-white` (hero sections) |

### Gold Subtitle (p below h1)

```
text-xl font-semibold text-gold leading-snug
```

| Property | Value | Tailwind |
|---|---|---|
| Font family | Noto Sans | inherited sans-serif, no class needed |
| Font size | 20px (1.25rem) | `text-xl` |
| Font weight | 600 | `font-semibold` |
| Line height | 1.375 | `leading-snug` |
| Color | gold | `text-gold` |

Subtitle is always smaller than h1 (20px vs 48–60px). ✓

## Changes Required

### 1. `src/components/[PageHero].tsx` — line 11

- h1: `text-4xl md:text-5xl` → `text-5xl md:text-6xl`
- Subtitle already has `text-xl font-semibold text-gold leading-snug` — no change needed

### 2. `src/app/page.tsx` — line 139 (h1), line 142 (subtitle)

- h1: replace `text-[58px] sm:text-[68px] lg:text-[76px] font-bold text-white leading-none tracking-tight ... whitespace-nowrap` with `text-5xl md:text-6xl font-bold text-white leading-tight`
- Subtitle: remove `md:text-2xl` → result: `text-xl font-semibold text-gold leading-snug`

### 3. `src/app/about/page.tsx` — line 43

- `<p>` acting as h1: `text-4xl md:text-5xl` → `text-5xl md:text-6xl`
- Note: this `<p>` uses gold/white split spans for styling — size update only, structure unchanged

### 4. `src/app/pricing/page.tsx` — line 25

- h1: `text-4xl md:text-5xl font-bold` → `text-5xl md:text-6xl font-bold leading-tight`

## Out of Scope

- Section headings (h2, h3) within page body content — separate concern
- `CardTitle` headings in Login/Dashboard — component-level, different context
- Animation classes (`animate-fade-up`, `delay-150`) — not typography, unchanged
- Spacing/margin classes (`mt-3`, `mb-5`, `max-w-2xl`) — layout concern, not typography standard

## Self-Review

- [x] No TBDs or placeholders
- [x] No contradictions — all four files get identical classes
- [x] Subtitle (20px) always smaller than heading (48–60px) — invariant holds
- [x] Font family already globally applied via CSS — no risk of drift
- [x] Scope is focused — 4 files, 6 class string changes total
