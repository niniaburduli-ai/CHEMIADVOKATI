# Homepage Full CMS Control — Design Spec
**Date:** 2026-06-15  
**Status:** Approved

## Overview

Make every homepage section, card, and content block fully manageable from the admin panel. Admin can add, remove, reorder, show/hide, and edit all content without touching code. A seed-on-first-load mechanism pre-populates the CMS with the current hardcoded values so the admin never starts from an empty form.

---

## 1. Data Model

### 1.1 Updated `HomePageData` (src/types/cms.ts)

```typescript
export interface HomePageServiceCard {
  _id: string
  title: string       // "AI იურისტი"
  subtitle: string    // "დასვი კითხვა"
  href: string        // "/chat"
  icon: string        // lucide icon name e.g. "MessageSquare"
  comingSoon: boolean // shows badge + disables link
  visible: boolean
  order: number
}

export interface HomePageStatCard {
  _id: string
  label: string   // "დასმული კითხვა"
  value: string   // "19+" — manual, no live DB
  icon: string    // lucide icon name
  visible: boolean
  order: number
}

export interface HomePageFeature {
  _id: string
  title: string
  body: string
  icon: string    // lucide icon name
  order: number
  visible: boolean
}

export interface HomePagePlanItem {
  text: string    // single bullet point
}

export interface HomePagePlan {
  _id: string
  name: string        // "სტანდარტული პაკეტი"
  price: string       // "19"
  badge: string       // "ყველაზე პოპულარული" or ""
  ctaText: string     // "აირჩიეთ პაკეტი"
  ctaHref: string     // "/register"
  plan: string        // "standard" | "premium" | "" (empty → free plan, renders <Link>)
  highlighted: boolean
  visible: boolean
  order: number
  items: string[]     // feature bullet list
}

export interface HomePageData {
  // Master section visibility switches
  sections: {
    hero: boolean
    stats: boolean
    features: boolean
    pricing: boolean
    cta: boolean
  }

  // Hero
  hero: {
    title: string
    subtitle: string
    ctaText: string
    ctaHref: string
    imageUrl: string
    imagePubId: string
  }
  serviceCards: HomePageServiceCard[]

  // Stats
  statsHeading: string
  stats: HomePageStatCard[]

  // Features / "Why" section
  featuresHeading: string
  features: HomePageFeature[]

  // Pricing
  pricingHeading: string
  plans: HomePagePlan[]

  // CTA
  ctaSection: {
    title: string
    subtitle: string
    buttonText: string
    buttonHref: string
  }

  status: CMSStatus
}
```

### 1.2 Seed Defaults

Applied when no HomePage document exists in MongoDB (first GET).  
Values match the current hardcoded content in `page.tsx` exactly.

```
sections: { hero: true, stats: true, features: true, pricing: true, cta: true }

hero: { title: "ჩემი იურისტი", subtitle: "კანონი მარტივ ენაზე", ctaText: "", ctaHref: "", imageUrl: "", imagePubId: "" }

serviceCards: [
  { title: "AI იურისტი",   subtitle: "დასვი კითხვა",        href: "/chat",      icon: "MessageSquare", comingSoon: false, visible: true, order: 0 },
  { title: "შაბლონები",    subtitle: "შექმენი შაბლონი",     href: "/templates", icon: "FileText",      comingSoon: true,  visible: true, order: 1 },
  { title: "დოკუმენტები",  subtitle: "შეამოწმე დოკუმენტი",  href: "/docs",      icon: "FolderOpen",    comingSoon: true,  visible: true, order: 2 },
]

statsHeading: "ჩვენი შედეგები ციფრებში"
stats: [
  { label: "დასმული კითხვა",              value: "0",  icon: "MessageSquare", visible: true, order: 0 },
  { label: "დამუშავებული დოკუმენტი",     value: "0",  icon: "FileText",      visible: true, order: 1 },
  { label: "გამოყენებული შაბლონი",       value: "0",  icon: "Layers",        visible: true, order: 2 },
  { label: "რეგისტრირებული მომხმარებელი", value: "11", icon: "Users",         visible: true, order: 3 },
]

featuresHeading: "რატომ ჩემი იურისტი?"
features: [
  { title: "მარტივი გამოყენება",   body: "დასვით კითხვა...",   icon: "MousePointerClick", order: 0, visible: true },
  { title: "სწრაფი პასუხები",      body: "მიიღეთ...",           icon: "Zap",               order: 1, visible: true },
  { title: "ერთ სივრცეში",         body: "იურიდიული...",        icon: "Layers",            order: 2, visible: true },
  { title: "უსაფრთხო გარემო",     body: "თქვენი კითხვები...", icon: "ShieldCheck",       order: 3, visible: true },
  { title: "24/7 ხელმისაწვდომობა", body: "მიიღეთ...",           icon: "Clock",             order: 4, visible: true },
]

pricingHeading: "აირჩიე თქვენზე მორგებული პაკეტი"
plans: [
  {
    name: "საბაზისო პაკეტი", price: "0", badge: "", ctaText: "დაიწყეთ უფასოდ",
    ctaHref: "/register", plan: "", highlighted: false, visible: true, order: 0,
    items: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"]
  },
  {
    name: "სტანდარტული პაკეტი", price: "19", badge: "ყველაზე პოპულარული",
    ctaText: "აირჩიეთ პაკეტი", ctaHref: "/register", plan: "standard",
    highlighted: true, visible: true, order: 1,
    items: ["29 კონსულტაცია AI იურისტთან", "19 შაბლონის გენერირება", "9 დოკუმენტის შემოწმება",
            "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"]
  },
  {
    name: "პრემიუმ (ბიზნეს) პაკეტი", price: "99", badge: "",
    ctaText: "აირჩიეთ პაკეტი", ctaHref: "/register", plan: "premium",
    highlighted: false, visible: true, order: 2,
    items: ["შეუზღუდავი კონსულტაცია AI იურისტთან", "შეუზღუდავი შაბლონის გენერირება",
            "99 დოკუმენტის/ხელშეკრულების შემოწმება", "ოფიციალური წყაროების მითითება",
            "კითხვების ისტორიის ნახვა", "გაფართოებული იურიდიული ანალიზი"]
  },
]

ctaSection: { title: "მზად ხარ?", subtitle: "დაარეგისტრირდი წამში...", buttonText: "რეგისტრაცია", buttonHref: "/register" }
status: "draft"
```

---

## 2. Mongoose Schema (src/lib/models/HomePage.ts)

Full replacement matching the new `HomePageData` shape:

- `sections` — embedded object with 5 Boolean fields, all default `true`
- `hero` — existing fields unchanged
- `serviceCards` — subdocument array with all `HomePageServiceCard` fields
- `statsHeading` — String
- `stats` — subdocument array with label, value, icon, visible, order
- `featuresHeading` — String  
- `features` — existing fields + add `visible: Boolean, default: true`
- `pricingHeading` — String
- `plans` — new subdocument array with all `HomePagePlan` fields; `items` stored as `[String]`
- `ctaSection` — existing, unchanged
- `status` — existing, unchanged
- `HomePageDoc` exported type — replace the current loose `Record<string, string>` approximation with a type that mirrors `HomePageData` (used by `route.ts`)

---

## 3. API Route (src/app/api/admin/cms/homepage/route.ts)

### GET
1. `getAdminSession()` — 401 if not admin
2. `HomePage.findOne()`
3. If null → create and save the seed document (full defaults above), return it
4. Return `{ data: doc }`

### PUT
1. `getAdminSession()` — 401 if not admin
2. Parse body (full `HomePageData` shape)
3. `HomePage.findOneAndUpdate({}, body, { upsert: true, new: true })`
4. `revalidatePath("/")`
5. Return `{ data: updatedDoc }`

---

## 4. Admin Form (src/components/admin/cms/HomePageForm.tsx)

Full rewrite. Layout: 6 accordion sections, each with a header row containing the section name and a master eye-toggle (`Eye`/`EyeOff` icon button) that maps to `sections.*`.

### 4.1 Section: Visibility Overview
Not a separate accordion — a compact grid of 5 toggle rows at the top:
```
[ Hero          ] [eye toggle]
[ Stats         ] [eye toggle]
[ Features      ] [eye toggle]
[ Pricing       ] [eye toggle]
[ CTA           ] [eye toggle]
```

### 4.2 Hero Section
- Inputs: title, subtitle (text), ctaText, ctaHref
- Image upload (existing `ImageUpload` component)
- **Service Cards** subsection:
  - Dynamic list; each card row shows:
    - Icon name input (text)
    - Title input
    - Subtitle input
    - Href input
    - "Coming soon" checkbox
    - Eye toggle (visible)
    - Up/Down arrow buttons (reorder by swapping `order`)
    - Delete button
  - "Add card" button appends new empty card

### 4.3 Stats Section
- `statsHeading` text input
- Dynamic list; each stat row shows:
  - Icon name input
  - Label input
  - Value input (e.g. "19+")
  - Eye toggle
  - Up/Down arrows
  - Delete button
- "Add stat" button

### 4.4 Features Section
- `featuresHeading` text input
- Dynamic list; each feature row shows:
  - Icon name input
  - Title input
  - Body textarea
  - Eye toggle
  - Up/Down arrows
  - Delete button
- "Add feature" button

### 4.5 Pricing Section
- `pricingHeading` text input
- Dynamic list; each plan card (collapsible within the section) shows:
  - Name input
  - Price input (numeric string)
  - Badge input (empty = no badge)
  - Plan selector: `""` / `"standard"` / `"premium"` (select element)
  - Highlighted checkbox
  - ctaText, ctaHref inputs
  - Items sub-list: each bullet is an Input + delete button; "Add bullet" appends
  - Eye toggle
  - Up/Down arrows
  - Delete plan button
- "Add plan" button

### 4.6 CTA Section
- title, subtitle, buttonText, buttonHref inputs (existing)

### 4.7 Save Controls
- "Draft" button → PUT with `status: "draft"`
- "Publish" button → PUT with `status: "published"`
- Status badge + success message (existing pattern)

---

## 5. Homepage (src/app/page.tsx)

### Changes
- Remove `getStats()` function and all DB model imports used only for stats
- Remove hardcoded `features` and `plans` const arrays
- All content sourced from `cms` with inline defaults as fallback (guards against empty DB)

### Render logic
```
// Section guards
{cms?.sections?.hero !== false && <HeroSection />}
{cms?.sections?.stats !== false && <StatsSection />}
{cms?.sections?.features !== false && <FeaturesSection />}
{cms?.sections?.pricing !== false && <PricingSection />}
{cms?.sections?.cta !== false && <CTASection />}

// Within sections, filter + sort visible items
const serviceCards = (cms?.serviceCards ?? SEED.serviceCards)
  .filter(c => c.visible !== false)
  .sort((a, b) => a.order - b.order)

const stats = (cms?.stats ?? SEED.stats)
  .filter(s => s.visible !== false)
  .sort((a, b) => a.order - b.order)

const features = (cms?.features ?? SEED.features)
  .filter(f => f.visible !== false)
  .sort((a, b) => a.order - b.order)

const plans = (cms?.plans ?? SEED.plans)
  .filter(p => p.visible !== false)
  .sort((a, b) => a.order - b.order)
```

- Icon resolution: a `ICON_MAP` object maps lucide name strings to icon components for dynamic rendering
- Service cards: `comingSoon: true` renders the grey disabled card; `false` renders the Link version
- Plans: `plan === ""` renders `<Link>` CTA; non-empty renders `<UpgradeButton plan={p.plan}>`

### Imports removed
- `Consultation`, `DocumentReview`, `GeneratedDocument`, `User` from `@/lib/models`
- `dbConnect` from `@/lib/db`
- Hardcoded icon imports replaced by `ICON_MAP` lookup

---

## 6. Files Changed

| File | Change |
|---|---|
| `src/types/cms.ts` | Add new interfaces; replace `HomePageData` |
| `src/lib/models/HomePage.ts` | Full schema replacement |
| `src/app/api/admin/cms/homepage/route.ts` | Add seed-on-empty GET logic |
| `src/components/admin/cms/HomePageForm.tsx` | Full rewrite |
| `src/app/page.tsx` | Read all from CMS, remove hardcoded arrays + DB stats query |

No other files touched.

---

## 7. Invariants & Constraints

- `stats[]` has no fixed length — admin can add/remove any number of stat cards
- `plan` field on pricing plans must be `""`, `"standard"`, or `"premium"` — these match the `UpgradeButton` prop; admin sets via dropdown, not free text
- Icon names are free-text; invalid names silently fall back to a generic `Circle` icon
- Seed is written to DB on first GET, not on build — avoids race conditions during cold starts
- `revalidatePath("/")` fires on every PUT — homepage ISR cache invalidated immediately
- `sections.*` defaults to `true` when field is missing (new installs before first save)
- `getHomePage()` in `src/lib/cms.ts` currently filters `status !== "published"` returning null — the page must handle `cms === null` by falling back to seed defaults inline (not from DB)
