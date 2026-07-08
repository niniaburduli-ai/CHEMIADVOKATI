# Service Split + Static Document Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the product into 4 independent services with 4 independent quota counters, and add a zero-AI-cost static document template system for the 4 document types with fixed legal structure (rental agreement, employment contract, power of attorney, termination notice), narrowing `/generate`'s AI drafting to the 2 types that genuinely need it (complaint, demand-letter).

**Architecture:** New `POST /api/templates` route does plain string interpolation against hardcoded template text + hardcoded legal-basis citations — no OpenRouter call. `/api/generate`'s accepted-type enum narrows from 6 to 2. Both write to the same `GeneratedDocument` collection (tagged with a new `source` field) and share one extracted result/preview/export UI component. A 4th quota counter (`docTemplatesRemaining`) is plumbed through the User/Plan models exactly like the existing 3, per the approved spec.

**Tech Stack:** Next.js 16 App Router, TypeScript, Mongoose, Zod, React 19 (client components), Tailwind + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-07-08-service-split-static-templates-design.md` (approved).

## Global Constraints

- No test runner is configured in this repo (confirmed in `CLAUDE.md`). Every task's "verify" step therefore uses one or more of: `npx tsc --noEmit` (type safety), `npm run lint`, a `curl` against the running dev server (API routes), or a manual dev-server check in the browser (UI). Do not add a test framework as part of this plan — out of scope.
- Next.js 16 App Router conventions apply — read `node_modules/next/dist/docs/01-app/` before touching routing/caching behavior if anything looks unfamiliar (per root `CLAUDE.md`/`AGENTS.md`).
- Path alias `@/*` → `src/*`.
- Actual numeric quota values (how many templates/month per plan) are **not** set in this plan — the user sets them later via the admin UI built in Task 14. Every default introduced here is a placeholder consistent with the existing `docGeneration` default (`1` on the User schema, `3`/`19`/`99` per plan in `plans.ts`... but for templates, since this is abuse-prevention only per the spec, use a generous placeholder: `20` on the User schema default and `20`/`50`/`200` in `plans.ts` for free/standard/premium).
- Never call OpenRouter from the new `/api/templates` route — that's the entire point of this feature. Any code review that finds a `callOpenRouter`/`callOpenRouterChat`/`fetch` to `openrouter.ai` in that route is a bug.
- Keep `DOC_TYPES` in `src/lib/validators.ts` covering all 6 document types (it's the label map used for history display regardless of which endpoint created the document) — only the per-endpoint *accepted*-type enums narrow, not this shared label map.

---

## File Structure

**New files:**
- `src/lib/legal/document-fields.ts` — shared form-field schema (moved out of `generate-client.tsx` so both client pages and the future need for server-side field lists have one source; not imported server-side in this plan, but keeps the two client pages from duplicating the field lists).
- `src/lib/legal/templates.ts` — the 4 static template bodies, their hardcoded legal-basis text, and the `renderTemplate()` interpolation function.
- `src/app/api/templates/route.ts` — `POST` handler: validate → interpolate → save → decrement `docTemplatesRemaining`. Zero AI calls.
- `src/app/templates/templates-client.tsx` — client page for the static-template flow, mirrors `generate-client.tsx`'s form UX but posts to `/api/templates`.
- `src/app/templates/page.tsx` — thin server wrapper (auth redirect + render client component), mirrors `src/app/generate/page.tsx`.
- `src/components/site/DocumentResultPanel.tsx` — extracted result/preview/edit/export panel shared by `/generate` and `/templates`.

**Modified files:**
- `src/lib/models/generated-document.ts` — add `source: "ai" | "template"`.
- `src/lib/models/user.ts` — add `docTemplatesRemaining`.
- `src/lib/models/Plan.ts` — add `docTemplates`, `includeDocTemplates`, `featuresDocTemplates`, `featuresDocTemplatesEn`.
- `src/lib/plans.ts` — add `docTemplates` to `PLAN_LIMITS`.
- `src/lib/plans-db.ts` — add `docTemplates` throughout (`PlanData`, `PlanLimits`, `DEFAULT_PLANS`, `toData()`, `getPlanLimits()`).
- `src/lib/flitt.ts` — add `docTemplatesRemaining` to `planActivationFields()`/`planDeactivationFields()`.
- `src/lib/features-config.ts` — add `"templates"` to `FeatureKey`/`DEFAULT_FLAGS`/`FEATURE_DEFS`.
- `src/lib/models/FeatureFlags.ts` — add `templates` boolean field.
- `src/auth.ts`, `src/actions/auth.ts`, `src/app/api/auth/register/route.ts` — grant `docTemplatesRemaining` default on signup.
- `src/lib/validators.ts` — narrow `GenerateDocSchema.type` to `complaint`/`demand-letter`; add `TEMPLATE_TYPES` + `GenerateTemplateSchema`.
- `src/app/generate/generate-client.tsx` — narrow to the 2 AI types, use the shared field module + shared result panel.
- `src/app/dashboard/page.tsx` — add the 4th quota card.
- `src/components/site/service-cards.tsx` — add a templates card, relabel generate.
- `src/lib/i18n/dictionaries.ts` — new KA/EN labels.
- `src/components/admin/PlansPanel.tsx`, `src/app/api/admin/plans/route.ts` — CRUD for the new plan fields.

---

### Task 1: `GeneratedDocument.source` field

**Files:**
- Modify: `src/lib/models/generated-document.ts`

**Interfaces:**
- Produces: `GeneratedDocumentDoc.source: "ai" | "template"` — consumed by Task 7 (`/api/templates`) and Task 8 (`/api/generate`, implicitly via existing create call).

- [ ] **Step 1: Add the field**

Edit `src/lib/models/generated-document.ts`:

```ts
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GeneratedDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true },
    legalBasis: { type: String, default: "" },
    source: { type: String, enum: ["ai", "template"], default: "ai" },
  },
  { timestamps: true }
);

export type GeneratedDocumentDoc = InferSchemaType<typeof GeneratedDocumentSchema> & { _id: unknown };

export const GeneratedDocument: Model<GeneratedDocumentDoc> =
  (models.GeneratedDocument as Model<GeneratedDocumentDoc>) ||
  model<GeneratedDocumentDoc>("GeneratedDocument", GeneratedDocumentSchema);
```

(`default: "ai"` means every existing document in the DB reads as `"ai"` once this deploys — correct, since they were all AI-generated before this change.)

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `generated-document.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/generated-document.ts
git commit -m "feat: add source field to GeneratedDocument model"
```

---

### Task 2: `docTemplatesRemaining` on User + signup grants

**Files:**
- Modify: `src/lib/models/user.ts`
- Modify: `src/auth.ts:66-76`
- Modify: `src/actions/auth.ts:74-82`
- Modify: `src/app/api/auth/register/route.ts:34-40`

**Interfaces:**
- Produces: `UserDoc.docTemplatesRemaining: number` — consumed by Task 7 (quota gate/decrement) and Task 3 (`flitt.ts` reset).

- [ ] **Step 1: Add the field to the schema**

Edit `src/lib/models/user.ts`, in `UserSchema`:

```ts
    consultationsRemaining: { type: Number, default: 1 },
    docGenerationRemaining: { type: Number, default: 1 },
    docReviewRemaining: { type: Number, default: 1 },
    docTemplatesRemaining: { type: Number, default: 20 },
```

- [ ] **Step 2: Grant it on Google OAuth signup**

Edit `src/auth.ts`, in the `signIn` callback's `User.create(...)` call (currently lines 66-76):

```ts
        const created = await User.create({
          email: user.email,
          name: user.name ?? user.email.split("@")[0],
          image: user.image ?? undefined,
          plan: "free",
          consultationsRemaining: 1,
          docGenerationRemaining: 1,
          docReviewRemaining: 1,
          docTemplatesRemaining: 20,
          consentAcceptedAt: new Date(),
          consentVersion: "1.0",
        });
```

- [ ] **Step 3: Grant it on credentials signup (server action)**

Edit `src/actions/auth.ts`, in `registerAction`'s `User.create(...)` call (currently lines 74-82). This path was already missing `docGenerationRemaining`/`docReviewRemaining` (relying on schema defaults) — leave that pre-existing behavior alone and just add the new field for consistency with the explicit-grant style used elsewhere in this same task:

```ts
  await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    plan: "free",
    consultationsRemaining: 1,
    docTemplatesRemaining: 20,
    consentAcceptedAt: new Date(),
    consentVersion: "1.0",
  });
```

- [ ] **Step 4: Grant it on the parallel register API route**

Edit `src/app/api/auth/register/route.ts`, in the `User.create(...)` call (currently lines 34-40):

```ts
  const user = await User.create({
    name,
    email,
    passwordHash,
    plan: "free",
    consultationsRemaining: 1,
    docTemplatesRemaining: 20,
  });
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual check**

Start the dev server (`npm run dev`), register a brand-new test account through `/register`, then check in MongoDB (or via `db.users.findOne({email: "<test email>"})` in `mongosh`) that the new user document has `docTemplatesRemaining: 20`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/models/user.ts src/auth.ts src/actions/auth.ts src/app/api/auth/register/route.ts
git commit -m "feat: add docTemplatesRemaining counter and grant it on signup"
```

---

### Task 3: `docTemplates` plan-level quota plumbing

**Files:**
- Modify: `src/lib/models/Plan.ts`
- Modify: `src/lib/plans.ts`
- Modify: `src/lib/plans-db.ts`
- Modify: `src/lib/flitt.ts:168-190`

**Interfaces:**
- Consumes: nothing new (mirrors existing `docGeneration`/`docReview` shape throughout).
- Produces: `PlanData.docTemplates: number`, `PlanData.includeDocTemplates: boolean`, `PlanLimits.docTemplates: number`, `planActivationFields()`/`planDeactivationFields()` now also return `docTemplatesRemaining` — consumed by Task 14 (admin UI) and by `/api/flitt/callback` (unchanged call site, new field flows through automatically).

- [ ] **Step 1: Add fields to the Plan schema + type**

Edit `src/lib/models/Plan.ts`. In `PlanSchema`, add after the `docReview` block:

```ts
    consultations: { type: Number, default: 0, min: 0 },
    docGeneration: { type: Number, default: 0, min: 0 },
    docReview: { type: Number, default: 0, min: 0 },
    docTemplates: { type: Number, default: 0, min: 0 },
    // Bullet list shown on the pricing card — base (always visible).
    features: { type: [String], default: [] },
    featuresEn: { type: [String], default: [] },
    // Service-specific bullets — shown only when that service is enabled globally + per-plan.
    featuresDocGeneration: { type: [String], default: [] },
    featuresDocGenerationEn: { type: [String], default: [] },
    featuresDocReview: { type: [String], default: [] },
    featuresDocReviewEn: { type: [String], default: [] },
    featuresDocTemplates: { type: [String], default: [] },
    featuresDocTemplatesEn: { type: [String], default: [] },
    includeDocGeneration: { type: Boolean, default: true },
    includeDocReview: { type: Boolean, default: true },
    includeDocTemplates: { type: Boolean, default: true },
```

In `PlanDoc` type, add:

```ts
export type PlanDoc = {
  _id: unknown
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 2: Add to `PLAN_LIMITS`**

Edit `src/lib/plans.ts`:

```ts
export const PLAN_LIMITS = {
  free:     { consultations: 9,    docGeneration: 3,    docReview: 1,  docTemplates: 20  },
  standard: { consultations: 29,   docGeneration: 19,   docReview: 9,  docTemplates: 50  },
  premium:  { consultations: 199,  docGeneration: 99,   docReview: 99, docTemplates: 200 },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
```

- [ ] **Step 3: Add to `plans-db.ts` types, defaults, normalization, and limits builder**

Edit `src/lib/plans-db.ts`. In `PlanData`:

```ts
export type PlanData = {
  id: string
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
}
```

In `PlanLimits`:

```ts
export type PlanLimits = {
  consultations: number
  docGeneration: number
  docReview: number
  docTemplates: number
}
```

In each of the 3 `DEFAULT_PLANS` entries, add `includeDocTemplates`/`docTemplates`/`featuresDocTemplates`/`featuresDocTemplatesEn` right after the `docReview` fields. Free plan entry becomes:

```ts
  {
    key: "free", name: "საბაზისო პაკეტი", nameEn: "Basic Plan",
    description: "სცადე როგორ მუშაობს", descriptionEn: "Try how it works",
    priceMinor: 0, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.free.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.free.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.free.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.free.docTemplates,
    features: ["9 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["9 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["3 შაბლონის გენერირება"], featuresDocGenerationEn: ["3 template generations"],
    featuresDocReview: ["1 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["1 document review"],
    featuresDocTemplates: ["20 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["20 ready-made template fills"],
    isFree: true, highlighted: false, visible: true, active: true, order: 0,
  },
```

Standard entry becomes:

```ts
  {
    key: "standard", name: "სტანდარტული პაკეტი", nameEn: "Standard Plan",
    description: "ყველაზე პოპულარული", descriptionEn: "Most popular",
    priceMinor: 1900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.standard.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.standard.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.standard.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.standard.docTemplates,
    features: ["29 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["29 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["19 შაბლონის გენერირება"], featuresDocGenerationEn: ["19 template generations"],
    featuresDocReview: ["9 დოკუმენტის შემოწმება"], featuresDocReviewEn: ["9 document reviews"],
    featuresDocTemplates: ["50 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["50 ready-made template fills"],
    isFree: false, highlighted: true, visible: true, active: true, order: 1,
  },
```

Premium entry becomes:

```ts
  {
    key: "premium", name: "პრემიუმ (ბიზნეს) პაკეტი", nameEn: "Premium (Business) Plan",
    description: "ხშირი მომხმარებლისთვის", descriptionEn: "For frequent users",
    priceMinor: 9900, currency: "GEL", period: "month",
    consultations: PLAN_LIMITS.premium.consultations,
    includeDocGeneration: true,
    docGeneration: PLAN_LIMITS.premium.docGeneration,
    includeDocReview: true,
    docReview: PLAN_LIMITS.premium.docReview,
    includeDocTemplates: true,
    docTemplates: PLAN_LIMITS.premium.docTemplates,
    features: ["199 კონსულტაცია AI იურისტთან", "ოფიციალური წყაროების მითითება", "კითხვების ისტორიის ნახვა"],
    featuresEn: ["199 AI lawyer consultations", "Official source citations", "View question history"],
    featuresDocGeneration: ["99 შაბლონის გენერირება"], featuresDocGenerationEn: ["99 template generations"],
    featuresDocReview: ["99 დოკუმენტის/ხელშეკრულების შემოწმება"], featuresDocReviewEn: ["99 document/contract reviews"],
    featuresDocTemplates: ["200 მზა შაბლონის შევსება"], featuresDocTemplatesEn: ["200 ready-made template fills"],
    isFree: false, highlighted: false, visible: true, active: true, order: 2,
  },
```

In `toData()`, add the normalization (mirroring the existing `defGen`/`defRev` pattern):

```ts
function toData(d: PlanDoc): PlanData {
  // Fall back to DEFAULT_PLANS text when DB doc is missing the field (pre-schema documents).
  const def = DEFAULT_PLANS.find((p) => p.key === d.key)
  const defGen = def?.includeDocGeneration ?? true
  const defRev = def?.includeDocReview ?? true
  const defTpl = def?.includeDocTemplates ?? true
  return {
    id: String(d._id),
    key: d.key,
    name: d.name,
    nameEn: d.nameEn ?? "",
    description: d.description ?? "",
    descriptionEn: d.descriptionEn ?? "",
    priceMinor: d.priceMinor ?? 0,
    currency: d.currency ?? "GEL",
    period: d.period ?? "month",
    consultations: d.consultations ?? 0,
    includeDocGeneration: d.includeDocGeneration == null ? defGen : d.includeDocGeneration,
    docGeneration: d.docGeneration ?? 0,
    includeDocReview: d.includeDocReview == null ? defRev : d.includeDocReview,
    docReview: d.docReview ?? 0,
    includeDocTemplates: d.includeDocTemplates == null ? defTpl : d.includeDocTemplates,
    docTemplates: d.docTemplates ?? 0,
    features: d.features ?? [],
    featuresEn: d.featuresEn ?? [],
    featuresDocGeneration: d.featuresDocGeneration?.length ? d.featuresDocGeneration : (def?.featuresDocGeneration ?? []),
    featuresDocGenerationEn: d.featuresDocGenerationEn?.length ? d.featuresDocGenerationEn : (def?.featuresDocGenerationEn ?? []),
    featuresDocReview: d.featuresDocReview?.length ? d.featuresDocReview : (def?.featuresDocReview ?? []),
    featuresDocReviewEn: d.featuresDocReviewEn?.length ? d.featuresDocReviewEn : (def?.featuresDocReviewEn ?? []),
    featuresDocTemplates: d.featuresDocTemplates?.length ? d.featuresDocTemplates : (def?.featuresDocTemplates ?? []),
    featuresDocTemplatesEn: d.featuresDocTemplatesEn?.length ? d.featuresDocTemplatesEn : (def?.featuresDocTemplatesEn ?? []),
    isFree: !!d.isFree,
    highlighted: !!d.highlighted,
    visible: d.visible !== false,
    active: d.active !== false,
    order: d.order ?? 0,
  }
}
```

In `getPlanLimits()`:

```ts
export async function getPlanLimits(key: string): Promise<PlanLimits> {
  const plan = await getPlanByKey(key)
  if (plan) {
    return {
      consultations: plan.consultations,
      docGeneration: plan.includeDocGeneration ? plan.docGeneration : 0,
      docReview: plan.includeDocReview ? plan.docReview : 0,
      docTemplates: plan.includeDocTemplates ? plan.docTemplates : 0,
    }
  }
  const f = PLAN_LIMITS.free
  return { consultations: f.consultations, docGeneration: f.docGeneration, docReview: f.docReview, docTemplates: f.docTemplates }
}
```

- [ ] **Step 4: Add to Flitt activation/deactivation**

Edit `src/lib/flitt.ts`:

```ts
/** Fields set when a subscription becomes active — reset quota for the period. */
export function planActivationFields(plan: PlanKey, limits: PlanLimits) {
  return {
    plan,
    subscriptionStatus: "active",
    consultationsRemaining: limits.consultations,
    docGenerationRemaining: limits.docGeneration,
    docReviewRemaining: limits.docReview,
    docTemplatesRemaining: limits.docTemplates,
    resetAt: new Date(Date.now() + PERIOD_MS),
  };
}

/** Fields set when a subscription ends — drop back to the free tier. */
export function planDeactivationFields(status: string) {
  const limits = PLAN_LIMITS.free;
  return {
    plan: "free" as const,
    subscriptionStatus: status,
    consultationsRemaining: limits.consultations,
    docGenerationRemaining: limits.docGeneration,
    docReviewRemaining: limits.docReview,
    docTemplatesRemaining: limits.docTemplates,
    resetAt: new Date(Date.now() + PERIOD_MS),
  };
}
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. `PLAN_LIMITS.free`/`.standard`/`.premium` must all satisfy `PlanLimits` (4 fields) — a missing field here is a compile error, which is the point of doing this in TypeScript rather than plain JS.

- [ ] **Step 6: Manual check**

Start the dev server, load `/pricing` and `/services` — confirm they still render (no crash from the new fields; nothing displays them yet since Task 13/14 aren't done, that's expected).

- [ ] **Step 7: Commit**

```bash
git add src/lib/models/Plan.ts src/lib/plans.ts src/lib/plans-db.ts src/lib/flitt.ts
git commit -m "feat: add docTemplates quota plumbing to Plan model and limits"
```

---

### Task 4: `templates` feature flag

**Files:**
- Modify: `src/lib/features-config.ts`
- Modify: `src/lib/models/FeatureFlags.ts`

**Interfaces:**
- Produces: `FeatureFlagsData.templates: boolean`, `featureForPath("/templates") === "templates"` — consumed by Task 10 (route gating pattern, if desired) and Task 13 (dashboard/nav visibility).

- [ ] **Step 1: Add to the config**

Edit `src/lib/features-config.ts`:

```ts
export type FeatureKey = "chat" | "generate" | "review" | "templates" | "legislation" | "blog"

export type FeatureFlagsData = Record<FeatureKey, boolean>

export const DEFAULT_FLAGS: FeatureFlagsData = {
  chat: true,
  generate: true,
  review: true,
  templates: true,
  legislation: true,
  blog: true,
}

/** Feature metadata for the admin panel + route/nav mapping. */
export const FEATURE_DEFS: {
  key: FeatureKey
  label: string
  description: string
  paths: string[]
}[] = [
  { key: "chat", label: "AI იურისტი (ჩატი)", description: "AI კონსულტაციის ჩატი", paths: ["/chat"] },
  { key: "generate", label: "დოკუმენტის გენერაცია", description: "საჩივრისა და მოთხოვნის AI დამუშავება", paths: ["/generate"] },
  { key: "review", label: "დოკუმენტის მიმოხილვა", description: "ატვირთული დოკუმენტის ანალიზი", paths: ["/review"] },
  { key: "templates", label: "მზა შაბლონები", description: "სტანდარტული დოკუმენტების შევსება", paths: ["/templates"] },
  { key: "legislation", label: "კანონმდებლობა", description: "კანონმდებლობის ბაზა", paths: ["/legislation"] },
  { key: "blog", label: "ბლოგი", description: "ბლოგის გვერდი", paths: ["/blog"] },
]
```

(Note: `generate`'s `description` is updated here too, since Task 8 narrows what that page actually does — it's no longer "templates and document creation", just the 2 AI-drafted types.)

- [ ] **Step 2: Add to the FeatureFlags schema**

Edit `src/lib/models/FeatureFlags.ts`:

```ts
const FeatureFlagsSchema = new Schema(
  {
    chat: { type: Boolean, default: true },
    generate: { type: Boolean, default: true },
    review: { type: Boolean, default: true },
    templates: { type: Boolean, default: true },
    legislation: { type: Boolean, default: true },
    blog: { type: Boolean, default: true },
  },
  { timestamps: true, minimize: false }
)

export type FeatureFlagsDoc = {
  _id: unknown
  chat: boolean
  generate: boolean
  review: boolean
  templates: boolean
  legislation: boolean
  blog: boolean
  createdAt: Date
  updatedAt: Date
}
```

And in `src/lib/features.ts`'s `getFeatureFlags()`, add the field to the returned object:

```ts
export async function getFeatureFlags(): Promise<FeatureFlagsData> {
  try {
    await dbConnect()
    const doc = await FeatureFlags.findOne().lean<FeatureFlagsDoc>()
    if (!doc) return { ...DEFAULT_FLAGS }
    return {
      chat: doc.chat !== false,
      generate: doc.generate !== false,
      review: doc.review !== false,
      templates: doc.templates !== false,
      legislation: doc.legislation !== false,
      blog: doc.blog !== false,
    }
  } catch {
    return { ...DEFAULT_FLAGS }
  }
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. If any other file constructs a `FeatureFlagsData` object literal, TS will now flag it for missing `templates` — fix any such site by adding `templates: true` (search first: `grep -rn "FeatureFlagsData = {" src/` or similar to catch any other literal besides `DEFAULT_FLAGS`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/features-config.ts src/lib/models/FeatureFlags.ts src/lib/features.ts
git commit -m "feat: add templates feature flag"
```

---

### Task 5: Extract shared form-field schema

**Files:**
- Create: `src/lib/legal/document-fields.ts`
- Modify: `src/app/generate/generate-client.tsx:1-118`

**Interfaces:**
- Produces: `COMMON_FIELDS: QuestionField[]`, `QUESTION_SCHEMAS: Record<string, QuestionField[]>`, `type QuestionField`, `type FieldType` — consumed by Task 10 (`templates-client.tsx`) and Task 6 (`templates.ts`'s `FIELD_MAP` uses the same keys, though it doesn't import this file directly).
- No behavior change in this task — pure extraction, `generate-client.tsx` renders identically before and after.

- [ ] **Step 1: Create the shared field module**

Create `src/lib/legal/document-fields.ts` with the content currently in `generate-client.tsx` lines 44-118 (unchanged):

```ts
export type FieldType = "text" | "textarea" | "date";
export type QuestionField = { key: string; label: string; type: FieldType; required?: boolean };

export const COMMON_FIELDS: QuestionField[] = [
  { key: "city", label: "ქალაქი", type: "text", required: true },
  { key: "docDate", label: "დოკუმენტის თარიღი", type: "date", required: true },
];

export const QUESTION_SCHEMAS: Record<string, QuestionField[]> = {
  complaint: [
    { key: "yourName", label: "შენი სახელი და გვარი", type: "text", required: true },
    { key: "yourId", label: "შენი პირადი ნომერი", type: "text", required: true },
    { key: "yourAddress", label: "შენი მისამართი", type: "text", required: true },
    { key: "respondent", label: "ვის ეხება საჩივარი", type: "text", required: true },
    { key: "amount", label: "თანხა/ზიანი (ასეთის არსებობისას)", type: "text" },
    { key: "paymentMethod", label: "გადახდის მეთოდი (ნაღდი/საბანკო გადარიცხვა) — თანხის მოთხოვნისას", type: "text" },
    { key: "bankAccount", label: "საბანკო ანგარიშის № (თუ გადარიცხვას ითხოვ)", type: "text" },
    { key: "incidentDate", label: "მოვლენის თარიღი", type: "date" },
  ],
  "rental-agreement": [
    { key: "landlord", label: "გამქირავებელი (სახელი, გვარი)", type: "text", required: true },
    { key: "landlordId", label: "გამქირავებლის პირადი ნომერი", type: "text", required: true },
    { key: "landlordAddress", label: "გამქირავებლის მისამართი", type: "text", required: true },
    { key: "landlordPhone", label: "გამქირავებლის ტელეფონი", type: "text" },
    { key: "tenant", label: "დამქირავებელი (სახელი, გვარი)", type: "text", required: true },
    { key: "tenantId", label: "დამქირავებლის პირადი ნომერი", type: "text", required: true },
    { key: "tenantAddress", label: "დამქირავებლის მისამართი", type: "text", required: true },
    { key: "tenantPhone", label: "დამქირავებლის ტელეფონი", type: "text" },
    { key: "address", label: "ბინის მისამართი", type: "text", required: true },
    { key: "rent", label: "ქირის ოდენობა", type: "text", required: true },
    { key: "paymentMethod", label: "ქირის გადახდის მეთოდი (ნაღდი/საბანკო გადარიცხვა)", type: "text", required: true },
    { key: "bankAccount", label: "საბანკო ანგარიშის № (თუ გადარიცხვაა)", type: "text" },
    { key: "duration", label: "ხელშეკრულების ვადა", type: "text", required: true },
  ],
  "employment-contract": [
    { key: "employer", label: "დამსაქმებელი", type: "text", required: true },
    { key: "employerId", label: "დამსაქმებლის საიდენტიფიკაციო/პირადი ნომერი", type: "text", required: true },
    { key: "employerAddress", label: "დამსაქმებლის მისამართი", type: "text", required: true },
    { key: "employee", label: "თანამშრომელი", type: "text", required: true },
    { key: "employeeId", label: "თანამშრომლის პირადი ნომერი", type: "text", required: true },
    { key: "employeeAddress", label: "თანამშრომლის მისამართი", type: "text", required: true },
    { key: "position", label: "პოზიცია", type: "text", required: true },
    { key: "salary", label: "ხელფასი", type: "text", required: true },
    { key: "salaryPaymentMethod", label: "ხელფასის გადახდის მეთოდი (ნაღდი/საბანკო გადარიცხვა)", type: "text", required: true },
    { key: "bankAccount", label: "თანამშრომლის საბანკო ანგარიშის № (თუ გადარიცხვაა)", type: "text" },
    { key: "startDate", label: "დაწყების თარიღი", type: "date", required: true },
  ],
  "power-of-attorney": [
    { key: "principal", label: "მინდობელი", type: "text", required: true },
    { key: "idNumber", label: "მინდობელის პირადი ნომერი", type: "text", required: true },
    { key: "principalAddress", label: "მინდობელის მისამართი", type: "text", required: true },
    { key: "agent", label: "მინდობილი პირი", type: "text", required: true },
    { key: "agentId", label: "მინდობილი პირის პირადი ნომერი", type: "text", required: true },
    { key: "agentAddress", label: "მინდობილი პირის მისამართი", type: "text", required: true },
    { key: "scope", label: "მინდობის ფარგლები", type: "textarea", required: true },
  ],
  "demand-letter": [
    { key: "yourName", label: "შენი სახელი და გვარი", type: "text", required: true },
    { key: "yourAddress", label: "შენი მისამართი", type: "text", required: true },
    { key: "recipient", label: "ადრესატი", type: "text", required: true },
    { key: "amount", label: "მოთხოვნილი თანხა", type: "text" },
    { key: "paymentMethod", label: "გადახდის სასურველი მეთოდი (ნაღდი/საბანკო გადარიცხვა)", type: "text" },
    { key: "bankAccount", label: "საბანკო ანგარიშის № (თუ გადარიცხვას ითხოვ)", type: "text" },
    { key: "reason", label: "მოთხოვნის საფუძველი", type: "textarea", required: true },
    { key: "deadline", label: "ვადა", type: "text", required: true },
  ],
  "termination-notice": [
    { key: "employer", label: "დამსაქმებელი", type: "text", required: true },
    { key: "employee", label: "თანამშრომელი", type: "text", required: true },
    { key: "employeeId", label: "თანამშრომლის პირადი ნომერი", type: "text", required: true },
    { key: "employeeAddress", label: "თანამშრომლის მისამართი", type: "text", required: true },
    { key: "reason", label: "საფუძველი", type: "text", required: true },
    { key: "lastDay", label: "ბოლო სამუშაო დღე", type: "date", required: true },
  ],
};
```

- [ ] **Step 2: Import it in `generate-client.tsx` instead of defining locally**

Edit `src/app/generate/generate-client.tsx`. Remove lines 44-118 (the `FieldType`/`QuestionField`/`COMMON_FIELDS`/`QUESTION_SCHEMAS` definitions) and add an import near the top instead:

```tsx
import { renderMarkdownBold } from "@/lib/markdown-bold";
import { parseDocumentLegalBasis } from "@/lib/legal/citations";
import { COMMON_FIELDS, QUESTION_SCHEMAS } from "@/lib/legal/document-fields";
```

(Place the new import line right after the existing `parseDocumentLegalBasis` import, matching the file's existing import ordering.)

- [ ] **Step 3: Verify types compile and app builds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds, no errors from `/generate`.

- [ ] **Step 4: Manual check**

Start the dev server, open `/generate`, confirm the doc-type dropdown and per-type fields still render exactly as before (this task changes zero behavior).

- [ ] **Step 5: Commit**

```bash
git add src/lib/legal/document-fields.ts src/app/generate/generate-client.tsx
git commit -m "refactor: extract document form-field schema to shared module"
```

---

### Task 6: Static template content module

**Files:**
- Create: `src/lib/legal/templates.ts`

**Interfaces:**
- Consumes: field keys from `src/lib/legal/document-fields.ts` (`QUESTION_SCHEMAS`/`COMMON_FIELDS` key names — referenced by name in `FIELD_MAP` below, not imported, since the map only needs the string keys which are stable).
- Produces: `type TemplateType`, `TEMPLATE_TYPES: readonly TemplateType[]`, `renderTemplate(type: TemplateType, answers: Record<string, string>): { content: string; legalBasis: string }` — consumed by Task 7 (`/api/templates`).

- [ ] **Step 1: Write the template data + interpolation logic**

Create `src/lib/legal/templates.ts`. Body text and legal-basis strings are copied verbatim from the approved spec (`docs/superpowers/specs/2026-07-08-service-split-static-templates-design.md`):

```ts
/**
 * Static document templates — pure string interpolation, zero AI calls.
 * Legal-basis citations are hardcoded per template (verified against the live
 * text at matsne.gov.ge on 2026-07-08 — see the design spec for sourcing).
 * Structure (preamble, force-majeure/dispute clauses, requisites block) is
 * modeled on real Georgian market contracts, not just statute text — see spec.
 */

export const TEMPLATE_TYPES = [
  "rental-agreement",
  "employment-contract",
  "power-of-attorney",
  "termination-notice",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

type TemplateDef = { body: string; legalBasis: string };

const RENTAL_BODY = `ბინის ქირავნობის ხელშეკრულება

ქ. **[CITY]**                                                                    **[DOC_DATE]**

ერთის მხრივ, **[LANDLORD]** (პ/ნ **[LANDLORD_ID]**, მისამართი: [LANDLORD_ADDRESS], ტელ: [LANDLORD_PHONE]) (შემდგომში — „გამქირავებელი“) და მეორეს მხრივ, **[TENANT]** (პ/ნ **[TENANT_ID]**, მისამართი: [TENANT_ADDRESS], ტელ: [TENANT_PHONE]) (შემდგომში — „დამქირავებელი“, ერთობლივად — „მხარეები“), ვდებთ წინამდებარე ხელშეკრულებას შემდეგზე:

**1. ხელშეკრულების საგანი**
გამქირავებელი გადასცემს დამქირავებელს სარგებლობაში საცხოვრებელ ფართს მისამართზე: **[PROPERTY_ADDRESS]** (შემდგომში — „ფართი“), ხოლო დამქირავებელი იღებს ვალდებულებას გადაუხადოს ქირა წინამდებარე ხელშეკრულებით დადგენილი წესით.

**2. ხელშეკრულების ვადა**
ხელშეკრულება ძალაშია **[DURATION]**-ის განმავლობაში, **[DOC_DATE]**-დან.

**3. ქირა და გადახდის წესი**
3.1. ყოველთვიური ქირა შეადგენს **[RENT]**-ს.
3.2. გადახდის მეთოდი: **[PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**.
3.3. ქირა გადაიხდება ყოველი საანგარიშო პერიოდის დასრულებისას, თუ მხარეები სხვაგვარად არ შეთანხმდებიან.
3.4. დამქირავებელს შეიძლება დაეკისროს ვალდებულების უზრუნველყოფის თანხის (დეპოზიტის) წარდგენა, რომელიც არ აღემატება ერთი თვის ქირის სამმაგ ოდენობას; წინასწარ გადახდილ თანხას ერიცხება კანონით დადგენილი პროცენტი და უბრუნდება დამქირავებელს ხელშეკრულების დასრულებისას.

**4. მხარეთა უფლება-მოვალეობები**
4.1. გამქირავებელი გადასცემს ფართს გამართულ, დანიშნულებისამებრ გამოსაყენებელ მდგომარეობაში.
4.2. დამქირავებელი იყენებს ფართს დანიშნულებისამებრ და ზრუნავს მის შენარჩუნებაზე.
4.3. ხელშეკრულების შეწყვეტისას დამქირავებელი აბრუნებს ფართს იმ მდგომარეობაში, რომელშიც მიიღო, ნორმალური ცვეთის გათვალისწინებით.

**5. ხელშეკრულების ვადამდე შეწყვეტა**
5.1. თუ დამქირავებელი არ იხდის ქირას ზედიზედ სამი თვის განმავლობაში, გამქირავებელს უფლება აქვს მოშალოს ხელშეკრულება ვადამდე.
5.2. განუსაზღვრელი ვადის შემთხვევაში, ნებისმიერ მხარეს შეუძლია მოშალოს ხელშეკრულება წერილობითი შეტყობინებით, სამთვიანი ვადის დაცვით, თუ მხარეები სხვა ვადაზე არ შეთანხმდნენ.
5.3. ხელშეკრულების შეწყვეტა ფორმდება წერილობით.

**6. ფორს-მაჟორი**
მხარეები თავისუფლდებიან პასუხისმგებლობისგან, თუ ვალდებულების შეუსრულებლობა გამოწვეულია დაუძლეველი ძალის გარემოებით (სტიქიური უბედურება, ომი, ეპიდემია და სხვა), რომლის თავიდან აცილება მხარეთა გონივრულ კონტროლს აღემატება.

**7. დავების გადაწყვეტა**
ხელშეკრულებასთან დაკავშირებული დავები წყდება მოლაპარაკების გზით, ხოლო შეთანხმების მიუღწევლობისას — საქართველოს კანონმდებლობით დადგენილი წესით, სასამართლოში.

**8. დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თითოეული მხარისთვის თანაბარი იურიდიული ძალით.

**მხარეთა რეკვიზიტები**
გამქირავებელი: **[LANDLORD]**, პ/ნ [LANDLORD_ID], მის: [LANDLORD_ADDRESS], ტელ: [LANDLORD_PHONE]     ხელმოწერა: ____________
დამქირავებელი: **[TENANT]**, პ/ნ [TENANT_ID], მის: [TENANT_ADDRESS], ტელ: [TENANT_PHONE]     ხელმოწერა: ____________`;

const EMPLOYMENT_BODY = `შრომის ხელშეკრულება

ქ. **[CITY]**                                                                    **[DOC_DATE]**

ერთის მხრივ, **[EMPLOYER]** (ს/ნ **[EMPLOYER_ID]**, მისამართი: [EMPLOYER_ADDRESS]) (შემდგომში — „დამსაქმებელი“) და მეორეს მხრივ, **[EMPLOYEE]** (პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]) (შემდგომში — „დასაქმებული“, ერთობლივად — „მხარეები“), ვდებთ წინამდებარე ხელშეკრულებას შემდეგზე:

**1. ხელშეკრულების საგანი**
დამსაქმებელი დასაქმებულს იღებს **[POSITION]**-ის პოზიციაზე **[START_DATE]**-დან, ხოლო დასაქმებული თანხმობას აცხადებს შეასრულოს დაკისრებული სამუშაო წინამდებარე ხელშეკრულებით დადგენილი პირობების შესაბამისად.

**2. ხელშეკრულების ვადა**
ხელშეკრულება დადებულია განუსაზღვრელი ვადით, თუ მხარეები წერილობით სხვაგვარად არ შეთანხმდებიან.

**3. სამუშაო დრო და დასვენება**
სამუშაო დრო და დასვენების პერიოდები განისაზღვრება საქართველოს შრომის კოდექსისა და დამსაქმებლის შინაგანაწესის შესაბამისად (არსებობის შემთხვევაში).

**4. ანაზღაურება**
4.1. თანამდებობრივი სარგო შეადგენს **[SALARY]**-ს თვეში.
4.2. გადახდის მეთოდი: **[SALARY_PAYMENT_METHOD]**. საბანკო ანგარიში: **[BANK_ACCOUNT]**.
4.3. ზეგანაკვეთური სამუშაო ანაზღაურდება კანონმდებლობის შესაბამისად.

**5. მხარეთა უფლება-მოვალეობები**
5.1. დამსაქმებელი ვალდებულია დროულად გადაუხადოს დასაქმებულს ხელფასი და უზრუნველყოს უსაფრთხო სამუშაო გარემო.
5.2. დასაქმებული ვალდებულია ჯეროვნად და კეთილსინდისიერად შეასრულოს დაკისრებული მოვალეობები.
5.3. დასაქმებულს ეძლევა კანონმდებლობით გათვალისწინებული ანაზღაურებადი და ანაზღაურების გარეშე შვებულება.

**6. ხელშეკრულების შეწყვეტა**
ხელშეკრულების შეწყვეტა ხდება საქართველოს შრომის კოდექსის 47-ე და 48-ე მუხლებით დადგენილი საფუძვლებითა და წესით, წინასწარი წერილობითი შეტყობინებით. საბოლოო ანგარიშსწორება ხდება შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა.

**7. დავების გადაწყვეტა**
შრომითი დავები წყდება მხარეთა მოლაპარაკებით, ხოლო შეთანხმების მიუღწევლობისას — სასამართლოში, საქართველოს კანონმდებლობით დადგენილი წესით.

**8. დასკვნითი დებულებები**
ხელშეკრულება შედგენილია 2 ეგზემპლარად, თანაბარი იურიდიული ძალით.

**მხარეთა რეკვიზიტები**
დამსაქმებელი: **[EMPLOYER]**, ს/ნ [EMPLOYER_ID], მის: [EMPLOYER_ADDRESS]     ხელმოწერა: ____________
დასაქმებული: **[EMPLOYEE]**, პ/ნ [EMPLOYEE_ID], მის: [EMPLOYEE_ADDRESS]     ხელმოწერა: ____________`;

const POWER_OF_ATTORNEY_BODY = `მინდობილობა

ქ. **[CITY]**                                                                    **[DOC_DATE]**

მე, **[PRINCIPAL]** (პ/ნ **[PRINCIPAL_ID]**, რეგისტრირებული მისამართზე: [PRINCIPAL_ADDRESS]) (შემდგომში — „მინდობელი“), ვანიჭებ **[AGENT]**-ს (პ/ნ **[AGENT_ID]**, რეგისტრირებული მისამართზე: [AGENT_ADDRESS]) (შემდგომში — „მინდობილი პირი“) წარმომადგენლობით უფლებამოსილებას შემდეგი მოქმედებების განსახორციელებლად:

**მინდობის ფარგლები:**
[SCOPE]

მინდობილი პირი ვალდებულია იმოქმედოს მინდობელის ინტერესების შესაბამისად, ამ მინდობილობის ფარგლების გადაცილების გარეშე.

**უფლებამოსილების შეწყვეტა:** უფლებამოსილება წყდება მისი ვადის გასვლით (თუ ვადა განისაზღვრა), მინდობილი პირის უარით, მინდობელის მიერ გაუქმებით, მინდობელის გარდაცვალებით ან დავალების შესრულებით. თუ ვადა არ არის მითითებული, მინდობილობა მოქმედებს გაუქმებამდე. უფლებამოსილების გაუქმებისას მინდობილი პირი ვალდებულია დაუბრუნოს მინდობელს მინდობილობის საბუთი.

**შენიშვნა:** კანონმდებლობით განსაზღვრულ შემთხვევებში (მაგ. უძრავი ქონების განკარგვა, სასამართლო წარმომადგენლობა) მინდობილობა საჭიროებს სანოტარო დამოწმებას.

მინდობელი: **[PRINCIPAL]**     ხელმოწერა: ____________`;

const TERMINATION_NOTICE_BODY = `შეტყობინება შრომითი ხელშეკრულების შეწყვეტის შესახებ

ქ. **[CITY]**                                                                    **[DOC_DATE]**

დამსაქმებელი: **[EMPLOYER]**
დასაქმებული: **[EMPLOYEE]**, პ/ნ **[EMPLOYEE_ID]**, მისამართი: [EMPLOYEE_ADDRESS]

წინამდებარე შეტყობინებით გაცნობებთ, რომ თქვენთან დადებული შრომითი ხელშეკრულება წყდება საქართველოს შრომის კოდექსის 47-ე მუხლის შესაბამისად, შემდეგი საფუძვლით:

**შეწყვეტის საფუძველი:** [REASON]

**შრომითი ურთიერთობის ბოლო დღე:** **[LAST_DAY]**

შეტყობინება გამოგზავნილია საქართველოს შრომის კოდექსის 48-ე მუხლით დადგენილი წინასწარი გაფრთხილების ვადის დაცვით. კანონით გათვალისწინებულ შემთხვევებში დასაქმებულს ეკუთვნის შესაბამისი კომპენსაცია.

საბოლოო ანგარიშსწორება განხორციელდება შრომითი ურთიერთობის შეწყვეტიდან არაუგვიანეს 7 კალენდარული დღისა (შრომის კოდექსის 44-ე მუხლი).

დასაქმებულს უფლება აქვს, კანონმდებლობით დადგენილი წესით მოითხოვოს შეწყვეტის საფუძვლის წერილობითი დასაბუთება და გაასაჩივროს გადაწყვეტილება სასამართლოში.

დამსაქმებელი: **[EMPLOYER]**     ხელმოწერა: ____________`;

const TEMPLATES: Record<TemplateType, TemplateDef> = {
  "rental-agreement": {
    body: RENTAL_BODY,
    legalBasis:
      "საქართველოს სამოქალაქო კოდექსი:\n- მუხლი 531\n- მუხლი 552\n- მუხლი 553\n- მუხლი 558\n- მუხლი 559\n- მუხლი 561\n- მუხლი 563\n- მუხლი 564",
  },
  "employment-contract": {
    body: EMPLOYMENT_BODY,
    legalBasis:
      "საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი“:\n- მუხლი 14\n- მუხლი 44\n- მუხლი 47\n- მუხლი 48",
  },
  "power-of-attorney": {
    body: POWER_OF_ATTORNEY_BODY,
    legalBasis:
      "საქართველოს სამოქალაქო კოდექსი:\n- მუხლი 107\n- მუხლი 108\n- მუხლი 109\n- მუხლი 110",
  },
  "termination-notice": {
    body: TERMINATION_NOTICE_BODY,
    legalBasis:
      "საქართველოს ორგანული კანონი „საქართველოს შრომის კოდექსი“:\n- მუხლი 44\n- მუხლი 47\n- მუხლი 48",
  },
};

/**
 * Maps each template's form-field keys (from QUESTION_SCHEMAS /
 * COMMON_FIELDS in document-fields.ts) to the [PLACEHOLDER] tokens used in
 * that template's body text.
 */
const FIELD_MAP: Record<TemplateType, Record<string, string>> = {
  "rental-agreement": {
    landlord: "LANDLORD", landlordId: "LANDLORD_ID", landlordAddress: "LANDLORD_ADDRESS", landlordPhone: "LANDLORD_PHONE",
    tenant: "TENANT", tenantId: "TENANT_ID", tenantAddress: "TENANT_ADDRESS", tenantPhone: "TENANT_PHONE",
    address: "PROPERTY_ADDRESS", rent: "RENT", paymentMethod: "PAYMENT_METHOD", bankAccount: "BANK_ACCOUNT", duration: "DURATION",
    city: "CITY", docDate: "DOC_DATE",
  },
  "employment-contract": {
    employer: "EMPLOYER", employerId: "EMPLOYER_ID", employerAddress: "EMPLOYER_ADDRESS",
    employee: "EMPLOYEE", employeeId: "EMPLOYEE_ID", employeeAddress: "EMPLOYEE_ADDRESS",
    position: "POSITION", salary: "SALARY", salaryPaymentMethod: "SALARY_PAYMENT_METHOD", bankAccount: "BANK_ACCOUNT", startDate: "START_DATE",
    city: "CITY", docDate: "DOC_DATE",
  },
  "power-of-attorney": {
    principal: "PRINCIPAL", idNumber: "PRINCIPAL_ID", principalAddress: "PRINCIPAL_ADDRESS",
    agent: "AGENT", agentId: "AGENT_ID", agentAddress: "AGENT_ADDRESS", scope: "SCOPE",
    city: "CITY", docDate: "DOC_DATE",
  },
  "termination-notice": {
    employer: "EMPLOYER", employee: "EMPLOYEE", employeeId: "EMPLOYEE_ID", employeeAddress: "EMPLOYEE_ADDRESS",
    reason: "REASON", lastDay: "LAST_DAY",
    city: "CITY", docDate: "DOC_DATE",
  },
};

/** Replace every `[PLACEHOLDER]` token in `body` using `values` (keyed by placeholder name, not form key). Missing/blank values render as `—`. */
function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\[([A-Z_]+)\]/g, (_match, key: string) => {
    const v = values[key]?.trim();
    return v ? v : "—";
  });
}

/**
 * Render a static template: map form answers (keyed by QUESTION_SCHEMAS
 * field key, e.g. "landlordPhone") to placeholder tokens, then interpolate.
 * Never calls any AI model.
 */
export function renderTemplate(
  type: TemplateType,
  answers: Record<string, string>
): { content: string; legalBasis: string } {
  const map = FIELD_MAP[type];
  const values: Record<string, string> = {};
  for (const [formKey, placeholder] of Object.entries(map)) {
    values[placeholder] = answers[formKey] ?? "";
  }
  const def = TEMPLATES[type];
  return { content: fillTemplate(def.body, values), legalBasis: def.legalBasis };
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke check via a scratch script**

There's no test runner, so verify the interpolation logic directly with a throwaway Node script (delete it after — it's not part of the codebase):

Create `scratch-check.mjs` at the repo root:

```js
import { renderTemplate } from "./src/lib/legal/templates.ts";
```

This won't run directly under plain Node (TS + ESM), so instead verify via the Next.js dev server once Task 7's route exists (Task 7's own manual `curl` check is the real verification of this function). Skip creating `scratch-check.mjs` — note it here only to explain why this task's verification is "compiles cleanly" and Task 7 is where `renderTemplate` gets exercised end-to-end.

- [ ] **Step 4: Commit**

```bash
git add src/lib/legal/templates.ts
git commit -m "feat: add static document template content and interpolation"
```

---

### Task 7: `POST /api/templates` route

**Files:**
- Modify: `src/lib/validators.ts` (add `GenerateTemplateSchema`)
- Create: `src/app/api/templates/route.ts`

**Interfaces:**
- Consumes: `renderTemplate` from Task 6, `DOC_TYPES` (existing, full 6-key label map) from `validators.ts`.
- Produces: `POST /api/templates` — request `{ type: TemplateType, answers: Record<string,string> }`, response `{ id, title, content, legalBasis }` (201) or `{ error, fields? }` (400/401/403/404).

- [ ] **Step 1: Add the request schema**

Edit `src/lib/validators.ts`, add near `GenerateDocSchema`:

```ts
export const TEMPLATE_TYPES = [
  "rental-agreement",
  "employment-contract",
  "power-of-attorney",
  "termination-notice",
] as const;

export const GenerateTemplateSchema = z.object({
  type: z.enum(TEMPLATE_TYPES),
  answers: z.record(z.string().max(500)).refine(
    (obj) => Object.keys(obj).length <= 30,
    { message: "Too many fields" }
  ),
});
export type GenerateTemplateInput = z.infer<typeof GenerateTemplateSchema>;
```

- [ ] **Step 2: Write the route**

Create `src/app/api/templates/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { GenerateTemplateSchema, DOC_TYPES } from "@/lib/validators";
import { renderTemplate } from "@/lib/legal/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GenerateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docTemplatesRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Template quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const { type, answers } = parsed.data;
  const { content, legalBasis } = renderTemplate(type, answers);
  const typeName = DOC_TYPES[type];
  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

  const docCreate = GeneratedDocument.create({
    userId: session.user.id,
    title,
    type,
    content,
    legalBasis,
    source: "template",
  });
  const saveOps: Promise<unknown>[] = [docCreate];
  if (!isAdmin) {
    saveOps.push(
      User.findByIdAndUpdate(session.user.id, { $inc: { docTemplatesRemaining: -1 } })
    );
  }
  const [doc] = await Promise.all(saveOps);

  return NextResponse.json(
    { id: String((doc as { _id: unknown })._id), title, content, legalBasis },
    { status: 201 }
  );
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. `DOC_TYPES[type]` must type-check — `type` is one of the 4 `TEMPLATE_TYPES`, which are a subset of `DOC_TYPES`'s keys, so this is safe.

- [ ] **Step 4: Manual end-to-end check**

Start the dev server. Get a session cookie by logging in through the browser at `/login`, then use the browser's dev-tools "copy as curl" on any authenticated request to capture the cookie header, or simpler: open the browser console on the logged-in site and run:

```js
fetch("/api/templates", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "power-of-attorney",
    answers: {
      principal: "გიორგი მაისურაძე", idNumber: "01234567890", principalAddress: "თბილისი, ვაჟა-ფშაველას 12",
      agent: "ნინო კვარაცხელია", agentId: "01987654321", agentAddress: "თბილისი, რუსთაველის 5",
      scope: "საბანკო ანგარიშის მართვა", city: "თბილისი", docDate: "2026-07-08",
    },
  }),
}).then(r => r.json()).then(console.log)
```

Expected: `201`-shaped JSON with `content` containing "მინდობილობა", the interpolated names/addresses, and `legalBasis` containing "მუხლი 107". Confirm in MongoDB that a new `generateddocuments` document was created with `source: "template"` and the requesting user's `docTemplatesRemaining` decremented by 1.

Also verify the quota gate: manually set your test user's `docTemplatesRemaining` to `0` in MongoDB, repeat the request, expect `403` with `"Template quota exceeded..."`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators.ts src/app/api/templates/route.ts
git commit -m "feat: add zero-AI POST /api/templates route"
```

---

### Task 8: Narrow `/api/generate` to complaint + demand-letter

**Files:**
- Modify: `src/lib/validators.ts:79-90`

**Interfaces:**
- No new interfaces — `GenerateDocSchema.type` narrows from a 6-value enum to a 2-value enum. `DOC_TYPES` (the label map) is untouched, still covers all 6.

- [ ] **Step 1: Narrow the schema**

Edit `src/lib/validators.ts`:

```ts
export const GenerateDocSchema = z.object({
  type: z.enum(["complaint", "demand-letter"]),
  details: z.string().min(10).max(2000),
});
export type GenerateDocInput = z.infer<typeof GenerateDocSchema>;
```

(`DOC_TYPES` above it stays as-is — all 6 entries — since it's the shared label map used by `/dashboard`, `/dashboard/documents`, and both `generate-client.tsx`/the new `templates-client.tsx` to display a human-readable type name regardless of which endpoint created the document.)

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. `src/app/api/generate/route.ts` does `DOC_TYPES[parsed.data.type]` where `parsed.data.type` is now `"complaint" | "demand-letter"` — both are valid keys of `DOC_TYPES`, so this still type-checks with no code change needed in that file.

- [ ] **Step 3: Manual check — old types now rejected**

Start the dev server, log in, and from the browser console:

```js
fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "rental-agreement", details: "test test test test" }),
}).then(r => r.json()).then(console.log)
```

Expected: `400` with `"Validation failed"` — `rental-agreement` is no longer an accepted type for this endpoint (it moved to `/api/templates` in Task 7).

Then confirm the still-valid path works:

```js
fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "complaint", details: "დავზიანდა ნივთი მაღაზიაში, მინდა ზიანის ანაზღაურება." }),
}).then(r => r.json()).then(console.log)
```

Expected: `201` with an AI-drafted complaint document (this still calls OpenRouter — correct, `complaint` stays on the AI path).

- [ ] **Step 4: Commit**

```bash
git add src/lib/validators.ts
git commit -m "feat: narrow /api/generate to complaint and demand-letter"
```

---

### Task 9: Extract shared `DocumentResultPanel` component

**Files:**
- Create: `src/components/site/DocumentResultPanel.tsx`
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- Produces: `DocumentResultPanel` React component, props `{ result: DocumentResult | null; setResult: Dispatch<SetStateAction<DocumentResult | null>>; emptyIcon?: ReactNode; emptyHint: string }` where `type DocumentResult = { id: string; title: string; content: string; legalBasis?: string }` — consumed by `generate-client.tsx` (this task) and Task 10 (`templates-client.tsx`).
- Consumes: `PATCH /api/generate/[id]` (existing route, source-agnostic — works for both AI-drafted and template-filled documents since it only looks up by `GeneratedDocument` id).

- [ ] **Step 1: Create the shared component**

Create `src/components/site/DocumentResultPanel.tsx`. This is `generate-client.tsx`'s current result-display block (lines 335-472 today) plus its supporting state/handlers (lines ~131-136, 190-218), made self-contained and reusable:

```tsx
"use client";

import { useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Download, Copy, Loader2, Pencil, Eye, Maximize2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { renderMarkdownBold } from "@/lib/markdown-bold";
import { parseDocumentLegalBasis } from "@/lib/legal/citations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportAsDocx, exportAsPdf } from "@/lib/export-document";
import { estimatePageCount } from "@/lib/page-count";

export type DocumentResult = { id: string; title: string; content: string; legalBasis?: string };

function normalizeSpacing(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * Result/preview/edit/export panel shared by the AI-generation page
 * (`/generate`) and the static-template page (`/templates`). Both flows save
 * their output as a `GeneratedDocument`, and `PATCH /api/generate/[id]` edits
 * either kind by id regardless of `source` — so this component doesn't need
 * to know which flow produced `result`.
 */
export function DocumentResultPanel({
  result,
  setResult,
  emptyHint,
}: {
  result: DocumentResult | null;
  setResult: Dispatch<SetStateAction<DocumentResult | null>>;
  emptyHint: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wordCount = result ? result.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const pageCount = result ? estimatePageCount(result.content) : 0;

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast.success("კოპირებულია");
  }

  async function saveContent(newContent: string) {
    if (!result) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/generate/${result.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!res.ok) {
        toast.error("ცვლილება ვერ შენახულა");
      }
    } catch {
      toast.error("ცვლილება ვერ შენახულა");
    } finally {
      setSaving(false);
    }
  }

  function scheduleSave(newContent: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveContent(newContent), 1000);
  }

  if (!result) {
    return (
      <Card className="flex items-center justify-center min-h-[300px] border-dashed">
        <CardContent className="text-center text-muted-foreground text-sm py-12">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
          {emptyHint}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{result.title}</CardTitle>
              <CardDescription>
                დოკუმენტი შეიქმნა და შენახულია ანგარიშში · {wordCount} სიტყვა · ~{pageCount} გვერდი
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
                {editing ? (
                  <><Eye className="h-4 w-4 mr-1" /> მზა ტექსტი</>
                ) : (
                  <><Pencil className="h-4 w-4 mr-1" /> რედაქტირება</>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={copy}>
                <Copy className="h-4 w-4 mr-1" /> კოპირება
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" /> ჩამოტვირთვა
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportAsDocx(result.content, result.title)}>
                    Word (.docx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAsPdf(result.content, result.title)}>
                    PDF (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                <Maximize2 className="h-4 w-4 mr-1" /> სრულ ეკრანზე
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <Textarea
              value={result.content}
              onChange={(e) => {
                const next = e.target.value;
                setResult((prev) => (prev ? { ...prev, content: next } : prev));
                scheduleSave(next);
              }}
              onBlur={() => {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveContent(result.content);
              }}
              className="min-h-[70vh] font-mono text-sm"
            />
          ) : (
            <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-4 leading-relaxed max-h-[70vh] overflow-y-auto">
              {renderMarkdownBold(normalizeSpacing(result.content))}
            </div>
          )}
          {saving && <p className="text-xs text-muted-foreground mt-2">ინახება...</p>}
        </CardContent>
      </Card>

      {result.legalBasis?.trim() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> სამართლებრივი საფუძვლები და წყაროები
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {parseDocumentLegalBasis(result.legalBasis).map((g, i) => (
              <div key={`${g.lawName}|${i}`} className="space-y-1">
                {g.lawName && <p className="text-sm font-medium">{g.lawName}</p>}
                {g.articles.length > 0 && (
                  <ul className="ml-1 space-y-0.5">
                    {g.articles.map((a, j) => (
                      <li key={j} className="text-xs text-muted-foreground">
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{result.title}</DialogTitle>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {renderMarkdownBold(normalizeSpacing(result.content))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" /> ჩამოტვირთვა
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportAsDocx(result.content, result.title)}>
                  Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsPdf(result.content, result.title)}>
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Note the `Loader2` import above is unused in this file (it was only used in `generate-client.tsx`'s submit button, which stays in the page component) — do not import it here.

- [ ] **Step 2: Use it from `generate-client.tsx`**

Edit `src/app/generate/generate-client.tsx`. This removes a large chunk of now-duplicated code and state:

- Remove these imports (now owned by `DocumentResultPanel`): `Download, Copy, Pencil, Eye, Maximize2, BookOpen, AlertTriangle` stays (still used for the quota-expiry banner) — keep `AlertTriangle`, `FileText`, `Loader2`, `ArrowLeft`; remove `Download, Copy, Pencil, Eye, Maximize2, BookOpen` from the `lucide-react` import.
- Remove the `Dialog*`, `DropdownMenu*`, `exportAsDocx, exportAsPdf`, `estimatePageCount`, `renderMarkdownBold`, `parseDocumentLegalBasis` imports (now used only inside `DocumentResultPanel`).
- Add: `import { DocumentResultPanel, type DocumentResult } from "@/components/site/DocumentResultPanel";`
- Remove state: `editing`, `saving`, `saveTimerRef`, `previewOpen` and the `normalizeSpacing`, `copy`, `saveContent`, `scheduleSave` functions (all moved into `DocumentResultPanel`).
- Change `const [result, setResult] = useState<{ id: string; title: string; content: string; legalBasis?: string } | null>(null);` to `const [result, setResult] = useState<DocumentResult | null>(null);`.
- In `generate()`, remove the two lines `setEditing(false);` and the `if (saveTimerRef.current) { ... }` block (no longer owned by this component).
- In the doc-type `onChange` handler, remove the `setEditing(false);` and `saveTimerRef` lines for the same reason.
- Replace the entire result-rendering JSX (the `{result ? (...) : (...)}` block, currently lines 335-437) with:

```tsx
        <DocumentResultPanel
          result={result}
          setResult={setResult}
          emptyHint={<>შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი”</>}
        />
```

- Remove the now-unused `<Dialog>` preview block at the bottom of the file (currently lines 440-472) — it moved into `DocumentResultPanel`.

- [ ] **Step 3: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors — in particular, no "declared but never used" for the imports/state removed in Step 2.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Start the dev server, go to `/generate`, generate a complaint document (or use an existing one from history), confirm: edit toggle still works and autosaves, copy button works, docx/pdf export buttons work, fullscreen preview dialog opens and shows the same content, legal-basis panel renders when present.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/DocumentResultPanel.tsx src/app/generate/generate-client.tsx
git commit -m "refactor: extract DocumentResultPanel shared component"
```

---

### Task 10: New `/templates` page

**Files:**
- Create: `src/app/templates/templates-client.tsx`
- Create: `src/app/templates/page.tsx`

**Interfaces:**
- Consumes: `COMMON_FIELDS`/`QUESTION_SCHEMAS` (Task 5), `DocumentResultPanel`/`DocumentResult` (Task 9), `POST /api/templates` (Task 7).
- Mirrors `src/app/generate/page.tsx`'s server-wrapper pattern — read that file first if its exact shape isn't obvious (it's a thin auth-redirect + client-component render; no changes needed to it in this plan).

- [ ] **Step 1: Read the existing `/generate/page.tsx` for the wrapper pattern**

Run: `cat src/app/generate/page.tsx` (or open it) — confirm whether it does an auth redirect server-side or relies on the client component / middleware. Match whatever pattern it uses exactly for `/templates/page.tsx` in Step 3 below (if it differs from the sketch given here, use the real pattern, not this plan's guess).

- [ ] **Step 2: Write the client component**

Create `src/app/templates/templates-client.tsx`, mirroring `generate-client.tsx`'s left-column form but limited to the 4 template types and posting to `/api/templates`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, ArrowLeft, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { COMMON_FIELDS, QUESTION_SCHEMAS } from "@/lib/legal/document-fields";
import { DocumentResultPanel, type DocumentResult } from "@/components/site/DocumentResultPanel";

const TEMPLATE_DOC_TYPES = [
  { value: "rental-agreement", label: "ქირავნობის ხელშეკრულება" },
  { value: "employment-contract", label: "შრომის ხელშეკრულება" },
  { value: "power-of-attorney", label: "მინდობილობა" },
  { value: "termination-notice", label: "სამსახურიდან გათავისუფლება" },
];

export function TemplatesClient({ initialType }: { initialType?: string } = {}) {
  const [type, setType] = useState(
    initialType && QUESTION_SCHEMAS[initialType] ? initialType : "rental-agreement"
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = [...COMMON_FIELDS, ...(QUESTION_SCHEMAS[type] ?? [])];
  const missingRequired = fields.filter((f) => f.required && !answers[f.key]?.trim());

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function fill() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "შეცდომა");
        return;
      }
      setResult(data);
      toast.success("დოკუმენტი შეივსო");
    } catch {
      setError("სერვისთან კავშირი ვერ დამყარდა");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> მზა შაბლონები
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            შეავსე ველები — დოკუმენტი მზადდება მყისიერად, AI-ს გარეშე
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr] items-start">
        <Card className="lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle className="text-base">შაბლონის ტიპი და დეტალები</CardTitle>
            <CardDescription>აირჩიე ტიპი და შეავსე მონაცემები</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-type">დოკუმენტის ტიპი</Label>
              <select
                id="template-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setAnswers({});
                  setResult(null);
                }}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TEMPLATE_DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    id={`field-${f.key}`}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                    className="min-h-[80px]"
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    type={f.type}
                    value={answers[f.key] ?? ""}
                    onChange={(e) => setAnswer(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                შესავსებია: {missingRequired.map((f) => f.label).join(", ")}
              </p>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={fill} disabled={loading || missingRequired.length > 0} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ივსება...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  შექმენი დოკუმენტი
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <DocumentResultPanel
          result={result}
          setResult={setResult}
          emptyHint={<>შეავსე დეტალები და დააჭირე „შექმენი დოკუმენტი”</>}
        />
      </div>
    </div>
  );
}
```

Note: unlike `generate-client.tsx`, there's no "დამატებითი დეტალები" (extra free-text) field and no 1-month-retention warning banner — templates are deterministic and instant, that framing doesn't apply. `missingRequired` gates the submit button directly since there's no `details.length < 10` free-text check to do instead.

- [ ] **Step 3: Write the page wrapper**

Create `src/app/templates/page.tsx` using the exact pattern found in Step 1's `src/app/generate/page.tsx`. If that file looks like this (typical Next.js App Router auth-gate pattern):

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/templates");

  const { type } = await searchParams;
  return <TemplatesClient initialType={type} />;
}
```

use it verbatim with `TemplatesClient`/`"./templates-client"` substituted for whatever `generate/page.tsx` actually imports — match its exact auth check, redirect path, and `searchParams` handling rather than this guess if they differ.

- [ ] **Step 4: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds, `/templates` appears in the route list.

- [ ] **Step 5: Manual check**

Start the dev server, visit `/templates` while logged out — expect redirect to `/login?callbackUrl=/templates`. Log in, visit `/templates` again, fill in the power-of-attorney form fields, submit — expect the result panel to show the filled document instantly (no loading delay beyond the network round-trip), with the legal-basis panel showing Civil Code Art. 107-110. Try editing the result inline and confirm autosave still works (same `PATCH /api/generate/[id]` route as the AI flow).

- [ ] **Step 6: Commit**

```bash
git add src/app/templates/
git commit -m "feat: add /templates page for static document filling"
```

---

### Task 11: Narrow `/generate` to complaint + demand-letter, update copy

**Files:**
- Modify: `src/app/generate/generate-client.tsx`

**Interfaces:**
- No new interfaces — this only narrows the local `DOC_TYPES` dropdown array and updates page copy. `QUESTION_SCHEMAS` (Task 5) already has entries for all 6 types, so `complaint`/`demand-letter` field rendering is unaffected.

- [ ] **Step 1: Narrow the local dropdown list**

Edit `src/app/generate/generate-client.tsx`, change the local `DOC_TYPES` array (this is the page's own dropdown-options array, distinct from `validators.ts`'s label-map `DOC_TYPES`):

```tsx
export const DOC_TYPES = [
  { value: "complaint", label: "საჩივარი" },
  { value: "demand-letter", label: "სამართლებრივი მოთხოვნა" },
];
```

- [ ] **Step 2: Update the default type and page copy**

Change the default `useState` type since `"complaint"` is still valid (no change needed there — it's already the first/default). Update the header copy to accurately describe the narrowed scope:

```tsx
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> დოკუმენტის მომზადება
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI ადგენს საჩივარს ან მოთხოვნას შენი კონკრეტული სიტუაციის მიხედვით
          </p>
```

(Standard templates like rental/employment/power-of-attorney/termination moved to `/templates` in Task 10 — this page description should no longer imply it covers those.)

- [ ] **Step 3: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Start the dev server, visit `/generate` — confirm the dropdown now shows only "საჩივარი" and "სამართლებრივი მოთხოვნა", and the header copy reflects the narrowed scope. Confirm generating a complaint still works end-to-end (this exercises the Task 8 schema narrowing + this task's UI narrowing together).

- [ ] **Step 5: Commit**

```bash
git add src/app/generate/generate-client.tsx
git commit -m "feat: narrow /generate UI to complaint and demand-letter"
```

---

### Task 12: Dashboard quota card for templates

**Files:**
- Modify: `src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `planData.includeDocTemplates`/`.docTemplates` (Task 3), `flags.templates` (Task 4), `user.docTemplatesRemaining` (Task 2), `LimitMetric` type (existing, from `@/components/site/limits-dialog`).

- [ ] **Step 1: Add the derived values**

Edit `src/app/dashboard/page.tsx`, alongside the existing `showGenerate`/`showReview` block:

```ts
  const consultLimit = planData?.consultations ?? 9;
  const showGenerate = flags.generate && planData ? planData.includeDocGeneration : false;
  const showReview = flags.review && planData ? planData.includeDocReview : false;
  const showTemplates = flags.templates && planData ? planData.includeDocTemplates : false;
  const genLimit = showGenerate ? (planData?.docGeneration ?? 0) : 0;
  const reviewLimit = showReview ? (planData?.docReview ?? 0) : 0;
  const templatesLimit = showTemplates ? (planData?.docTemplates ?? 0) : 0;

  const consultRemaining = user.consultationsRemaining ?? 0;
  const docGenRemaining = user.docGenerationRemaining ?? 0;
  const docReviewRemaining = user.docReviewRemaining ?? 0;
  const docTemplatesRemaining = user.docTemplatesRemaining ?? 0;
```

- [ ] **Step 2: Count template-sourced documents separately from AI-generated ones**

The existing `documentsCount` counts ALL `GeneratedDocument`s for the user regardless of `source`. Since templates and AI-generation are now separate quota tracks, split the count. Edit the `Promise.all` data-loading block:

```ts
  const [user, sub, flags, consultations, documents, reviews, consultationsCount, documentsCount, reviewsCount, templatesCount] =
    await Promise.all([
      User.findById(session.user.id).select("-passwordHash").lean(),
      Subscription.findOne({ userId: session.user.id }).lean(),
      getFeatureFlags(),
      Consultation.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      GeneratedDocument.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      DocumentReview.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(5).lean(),
      Consultation.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: "ai" }),
      DocumentReview.countDocuments({ userId: session.user.id }),
      GeneratedDocument.countDocuments({ userId: session.user.id, source: "template" }),
    ]);
```

(`documentsCount`'s query gains `source: "ai"` so the existing "documents generated" card keeps counting only AI-drafted docs; `templatesCount` is the new counter for the new card. The `documents` preview list on line ~51 stays showing the 5 most recent regardless of source — that list already renders `DOC_TYPES[doc.type]` labels that work for all 6 types, so no change needed there.)

- [ ] **Step 3: Add the 4th `limitMetrics` entry**

Edit the `limitMetrics` array construction, adding a `FileText`-icon (already imported) entry after the `review` one — but templates need their own history label. First add a dictionary key (this is completed fully in Task 13; for now reference `dp.templatesFilled` and add it as a temporary literal if Task 13 hasn't run yet — since these tasks execute in order in this plan, `dp.templatesFilled` will already exist by the time this step runs. If executing tasks out of order, add `templatesFilled: "შევსებული შაბლონები"` to `src/lib/i18n/dictionaries.ts`'s `profile` section under both `ka` and `en` locales before this step, matching the existing `documentsGenerated`/`documentsAnalyzed` keys' pattern):

```ts
  const limitMetrics: LimitMetric[] = [
    {
      key: "consultations",
      label: dp.questionsAsked,
      icon: <MessagesSquare className="h-4 w-4 text-primary" />,
      used: consultationsCount,
      remaining: consultRemaining,
      total: consultLimit,
      isUnlimited: isAdmin || consultLimit >= 9999,
    },
    ...(showGenerate
      ? [
          {
            key: "generate",
            label: dp.documentsGenerated,
            icon: <FileText className="h-4 w-4 text-primary" />,
            used: documentsCount,
            remaining: docGenRemaining,
            total: genLimit,
            isUnlimited: isAdmin || genLimit >= 9999,
          },
        ]
      : []),
    ...(showReview
      ? [
          {
            key: "review",
            label: dp.documentsAnalyzed,
            icon: <FileSearch className="h-4 w-4 text-primary" />,
            used: reviewsCount,
            remaining: docReviewRemaining,
            total: reviewLimit,
            isUnlimited: isAdmin || reviewLimit >= 9999,
          },
        ]
      : []),
    ...(showTemplates
      ? [
          {
            key: "templates",
            label: dp.templatesFilled,
            icon: <FileText className="h-4 w-4 text-primary" />,
            used: templatesCount,
            remaining: docTemplatesRemaining,
            total: templatesLimit,
            isUnlimited: isAdmin || templatesLimit >= 9999,
          },
        ]
      : []),
  ];
```

- [ ] **Step 4: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors (this step will fail until Task 13 adds `dp.templatesFilled` to the dictionary type — if running tasks in order, do Task 13's dictionary addition first, or add the key inline now and let Task 13 fill in its final wording).

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manual check**

Start the dev server, log in as a user with `flags.templates` on and a plan with `includeDocTemplates: true`, visit `/dashboard` — confirm a 4th limits entry appears in the limits dialog showing templates used/remaining/total. Fill a template via `/templates`, refresh `/dashboard`, confirm the "used" count incremented and "remaining" decremented.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add templates quota card to dashboard"
```

---

### Task 13: Nav entry + i18n labels

**Files:**
- Modify: `src/components/site/service-cards.tsx`
- Modify: `src/lib/i18n/dictionaries.ts`

**Interfaces:**
- Produces: `d.profile.templatesFilled` (KA/EN) — consumed by Task 12. `d.servicesModal.templatesTab`/`.templatesHint` get repointed to mean the new `/templates` page (not `/generate` as today); a new pair of keys describes `/generate` accurately.

- [ ] **Step 1: Add dictionary keys**

Edit `src/lib/i18n/dictionaries.ts`. In the Georgian (`ka`) dictionary's `profile` section, add near `documentsAnalyzed`:

```ts
    documentsGenerated: "დოკუმენტის გენერაცია",
    documentsAnalyzed: "დოკუმენტის მიმოხილვა",
    templatesFilled: "შევსებული შაბლონები",
```

In the English (`en`) dictionary's `profile` section, add the matching key:

```ts
    documentsGenerated: "Document generation",
    documentsAnalyzed: "Document review",
    templatesFilled: "Templates filled",
```

In the `ka` dictionary's `servicesModal` section, the existing `templatesTab`/`templatesHint` keys currently describe the AI `/generate` page (per the design spec's mislabeling note). Repoint them to the new `/templates` page and add a new pair for `/generate`:

```ts
    templatesTab: "მზა შაბლონები",
    templatesHint: "შეავსე მზა შაბლონი მყისიერად, AI-ს გარეშე",
    customDocsTab: "დოკუმენტის მომზადება",
    customDocsHint: "AI ადგენს საჩივარს ან მოთხოვნას შენი სიტუაციის მიხედვით",
```

Mirror the same 4 keys in the `en` dictionary's `servicesModal` section:

```ts
    templatesTab: "Ready templates",
    templatesHint: "Fill a ready template instantly, no AI involved",
    customDocsTab: "Custom drafting",
    customDocsHint: "AI drafts a complaint or demand letter for your situation",
```

- [ ] **Step 2: Update `service-cards.tsx` to show 4 services**

Edit `src/components/site/service-cards.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight, MessageCircle, FileText, FolderSearch, LayoutTemplate } from "lucide-react";
import { AnimateIn } from "@/components/site/AnimateIn";
import type { Dict } from "@/lib/i18n/dictionaries";
import type { FeatureFlagsData } from "@/lib/features";

export function ServiceCards({
  cardsHeading,
  d,
  flags,
}: {
  cardsHeading: string;
  d: Dict;
  flags: FeatureFlagsData;
}) {
  const items = [
    { key: "chat", icon: MessageCircle, label: d.servicesModal.aiTab, desc: d.servicesModal.aiSubtitle, enabled: flags.chat },
    { key: "review", icon: FolderSearch, label: d.documentAnalysis.title, desc: d.documentAnalysis.subtitle, enabled: flags.review },
    { key: "templates", icon: LayoutTemplate, label: d.servicesModal.templatesTab, desc: d.servicesModal.templatesHint, enabled: flags.templates },
    { key: "generate", icon: FileText, label: d.servicesModal.customDocsTab, desc: d.servicesModal.customDocsHint, enabled: flags.generate },
  ].filter((i) => i.enabled);

  if (items.length === 0) return null;

  const gridCols =
    items.length === 1 ? "grid-cols-1 max-w-sm mx-auto" :
    items.length === 2 ? "sm:grid-cols-2 max-w-2xl mx-auto" :
    items.length === 3 ? "sm:grid-cols-3" :
    "sm:grid-cols-2 lg:grid-cols-4";
```

(The rest of the file — the `.map()` render block and the "learn more" link — is unchanged; only the `items` array and the `gridCols` 4-item case are new.)

- [ ] **Step 3: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors. If `Dict`/dictionary types are structurally inferred from the `ka` object (common pattern — check `src/lib/i18n/dictionaries.ts`'s exports), adding keys to both `ka` and `en` in lockstep avoids a structural mismatch; if TS flags a missing key in one locale, add it there too.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual check**

Start the dev server, visit `/` (homepage) — confirm 4 service cards render: AI Chat, Document Analysis, Ready Templates, Custom Drafting. Click through each to confirm links go to `/chat`, `/review`, `/templates`, `/generate` respectively. Switch locale to English (if the site has a locale switcher) and confirm the English labels render.

- [ ] **Step 5: Commit**

```bash
git add src/components/site/service-cards.tsx src/lib/i18n/dictionaries.ts
git commit -m "feat: add templates service card, relabel generate card"
```

---

### Task 14: Admin quota editing for templates

**Files:**
- Modify: `src/app/api/admin/plans/route.ts`
- Modify: `src/components/admin/PlansPanel.tsx`

**Interfaces:**
- Consumes: `docTemplates`/`includeDocTemplates`/`featuresDocTemplates[En]` (Task 3).
- This is the UI the user uses later to set the real numeric limits (per the spec: "actual numbers are the user's call later"). Without this task, the plumbing from Task 3 has no admin-facing way to be edited.

- [ ] **Step 1: Add to the admin Zod schema**

Edit `src/app/api/admin/plans/route.ts`, in `PlanSchema`:

```ts
export const PlanSchema = z.object({
  key: z.string().trim().min(1).max(40).regex(PLAN_KEY_RE, "მხოლოდ a-z, 0-9, -"),
  name: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().max(80).default(""),
  description: z.string().trim().max(200).default(""),
  descriptionEn: z.string().trim().max(200).default(""),
  priceMinor: z.coerce.number().int().min(0).max(10_000_000).default(0),
  currency: z.string().trim().max(8).default("GEL"),
  period: z.string().trim().max(16).default("month"),
  consultations: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocGeneration: z.boolean().default(true),
  docGeneration: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocReview: z.boolean().default(true),
  docReview: z.coerce.number().int().min(0).max(1_000_000).default(0),
  includeDocTemplates: z.boolean().default(true),
  docTemplates: z.coerce.number().int().min(0).max(1_000_000).default(0),
  features: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocGeneration: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocGenerationEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocReview: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocReviewEn: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocTemplates: z.array(z.string().trim().max(200)).max(30).default([]),
  featuresDocTemplatesEn: z.array(z.string().trim().max(200)).max(30).default([]),
  isFree: z.boolean().default(false),
  highlighted: z.boolean().default(false),
  visible: z.boolean().default(true),
  active: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(1000).default(0),
})
```

(Check `src/app/api/admin/plans/[id]/route.ts` too — if it has its own copy of `PlanSchema` rather than importing this one, apply the identical addition there.)

- [ ] **Step 2: Add to the `PlansPanel` type, blank form, and defaults**

Edit `src/components/admin/PlansPanel.tsx`:

```ts
type Plan = {
  id: string
  key: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  priceMinor: number
  currency: string
  period: string
  consultations: number
  includeDocGeneration: boolean
  docGeneration: number
  includeDocReview: boolean
  docReview: number
  includeDocTemplates: boolean
  docTemplates: number
  features: string[]
  featuresEn: string[]
  featuresDocGeneration: string[]
  featuresDocGenerationEn: string[]
  featuresDocReview: string[]
  featuresDocReviewEn: string[]
  featuresDocTemplates: string[]
  featuresDocTemplatesEn: string[]
  isFree: boolean
  highlighted: boolean
  visible: boolean
  active: boolean
  order: number
}

const BLANK: Plan = {
  id: "", key: "", name: "", nameEn: "", description: "", descriptionEn: "",
  priceMinor: 0, currency: "GEL", period: "month",
  consultations: 0, includeDocGeneration: true, docGeneration: 0, includeDocReview: true, docReview: 0,
  includeDocTemplates: true, docTemplates: 0,
  features: [], featuresEn: [],
  featuresDocGeneration: [], featuresDocGenerationEn: [],
  featuresDocReview: [], featuresDocReviewEn: [],
  featuresDocTemplates: [], featuresDocTemplatesEn: [],
  isFree: false, highlighted: false, visible: true, active: true, order: 0,
}

const DEFAULT_TPL_KA: Record<string, string> = {
  standard: "50 მზა შაბლონის შევსება",
  premium: "200 მზა შაბლონის შევსება",
}
const DEFAULT_TPL_EN: Record<string, string> = {
  standard: "50 ready-made template fills",
  premium: "200 ready-made template fills",
}
```

- [ ] **Step 3: Add the include-badge to the plans table**

Edit the table row rendering in `PlansPanel`:

```tsx
                <td>
                  <div className="text-muted-foreground text-xs">{p.consultations} კონს.</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocGeneration ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      მოთხ: {p.includeDocGeneration ? "✓" : "✗"}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocReview ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      დოკ: {p.includeDocReview ? "✓" : "✗"}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.includeDocTemplates ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      შაბლ: {p.includeDocTemplates ? "✓" : "✗"}
                    </span>
                  </div>
                </td>
```

(Note the `docGeneration` badge label changes from "შაბლ" to "მოთხ" (short for "მოთხოვნა"/demand) here since that quota no longer means "templates" — it's the AI custom-drafting quota now. "შაბლ" moves to the new `docTemplates` badge, which is the accurate meaning going forward.)

- [ ] **Step 4: Sync new textarea state in `PlanDialog`**

Edit `PlanDialog`'s state and sync block:

```ts
  const [featuresTplText, setFeaturesTplText] = useState("")
  const [featuresTplEnText, setFeaturesTplEnText] = useState("")
```

```ts
  if (plan && plan.id !== syncedId) {
    setSyncedId(plan.id)
    setForm({ ...plan })
    setPriceGel((plan.priceMinor / 100).toString())
    setFeaturesText((plan.features ?? []).join("\n"))
    setFeaturesEnText((plan.featuresEn ?? []).join("\n"))
    setFeaturesGenText((plan.featuresDocGeneration ?? []).join("\n"))
    setFeaturesGenEnText((plan.featuresDocGenerationEn ?? []).join("\n"))
    setFeaturesRevText((plan.featuresDocReview ?? []).join("\n"))
    setFeaturesRevEnText((plan.featuresDocReviewEn ?? []).join("\n"))
    setFeaturesTplText((plan.featuresDocTemplates ?? []).join("\n"))
    setFeaturesTplEnText((plan.featuresDocTemplatesEn ?? []).join("\n"))
  }
```

- [ ] **Step 5: Include the new fields in the save payload**

Edit `save()`:

```ts
    const payload = {
      ...form,
      priceMinor: Math.round((parseFloat(priceGel) || 0) * 100),
      features: split(featuresText),
      featuresEn: split(featuresEnText),
      featuresDocGeneration: split(featuresGenText),
      featuresDocGenerationEn: split(featuresGenEnText),
      featuresDocReview: split(featuresRevText),
      featuresDocReviewEn: split(featuresRevEnText),
      featuresDocTemplates: split(featuresTplText),
      featuresDocTemplatesEn: split(featuresTplEnText),
    }
```

- [ ] **Step 6: Add the form fields to the dialog**

Add a 4th column-worth of inputs alongside the existing consultations/generation/review row — change that row from `sm:grid-cols-3` to `sm:grid-cols-2` (2x2 layout reads better with 4 items than a cramped 4-column row) and add the templates block:

```tsx
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>კონსულტაცია</Label>
              <Input type="number" min={0} value={form.consultations} onChange={(e) => set("consultations", Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocGeneration}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocGeneration", checked)
                    if (checked && !featuresGenText.trim()) {
                      setFeaturesGenText(DEFAULT_GEN_KA[form.key] ?? "")
                      setFeaturesGenEnText(DEFAULT_GEN_EN[form.key] ?? "")
                    }
                  }}
                />
                მოთხ. გენ. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docGeneration} disabled={!form.includeDocGeneration} onChange={(e) => set("docGeneration", Number(e.target.value))} className={!form.includeDocGeneration ? "opacity-40" : ""} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocReview}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocReview", checked)
                    if (checked && !featuresRevText.trim()) {
                      setFeaturesRevText(DEFAULT_REV_KA[form.key] ?? "")
                      setFeaturesRevEnText(DEFAULT_REV_EN[form.key] ?? "")
                    }
                  }}
                />
                დოკ. მიმ. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docReview} disabled={!form.includeDocReview} onChange={(e) => set("docReview", Number(e.target.value))} className={!form.includeDocReview ? "opacity-40" : ""} />
            </div>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                <input
                  type="checkbox"
                  checked={form.includeDocTemplates}
                  onChange={(e) => {
                    const checked = e.target.checked
                    set("includeDocTemplates", checked)
                    if (checked && !featuresTplText.trim()) {
                      setFeaturesTplText(DEFAULT_TPL_KA[form.key] ?? "")
                      setFeaturesTplEnText(DEFAULT_TPL_EN[form.key] ?? "")
                    }
                  }}
                />
                შაბლ. შევს. (ჩართული)
              </label>
              <Input type="number" min={0} value={form.docTemplates} disabled={!form.includeDocTemplates} onChange={(e) => set("docTemplates", Number(e.target.value))} className={!form.includeDocTemplates ? "opacity-40" : ""} />
            </div>
          </div>
```

And add a features-textarea row for templates, mirroring the existing generation/review ones:

```tsx
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className={!form.includeDocTemplates ? "text-muted-foreground" : ""}>შაბლ. შევს. KA {!form.includeDocTemplates && "(გამორთ.)"}</Label>
              <Textarea rows={2} value={featuresTplText} onChange={(e) => setFeaturesTplText(e.target.value)} disabled={!form.includeDocTemplates} className={!form.includeDocTemplates ? "opacity-40" : ""} placeholder={"50 მზა შაბლონის შევსება"} />
            </div>
            <div className="grid gap-2">
              <Label className={!form.includeDocTemplates ? "text-muted-foreground" : ""}>Templates EN {!form.includeDocTemplates && "(disabled)"}</Label>
              <Textarea rows={2} value={featuresTplEnText} onChange={(e) => setFeaturesTplEnText(e.target.value)} disabled={!form.includeDocTemplates} className={!form.includeDocTemplates ? "opacity-40" : ""} placeholder={"50 ready-made template fills"} />
            </div>
          </div>
```

- [ ] **Step 7: Verify types compile and build succeeds**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 8: Manual check**

Start the dev server, log in as an admin, go to the admin plans panel, edit the "standard" plan — confirm a "შაბლ. შევს." checkbox + number input appears, defaults to checked with `50` (from `PLAN_LIMITS.standard.docTemplates` via the seeded default), change it to e.g. `75`, save, reopen the dialog, confirm `75` persisted. Confirm the plans table's badge row now shows 3 badges (მოთხ/დოკ/შაბლ) per plan.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/admin/plans/route.ts src/components/admin/PlansPanel.tsx
git commit -m "feat: add admin CRUD for docTemplates plan quota"
```

---

## Out of scope (explicitly deferred, per spec)

- Public pricing/marketing feature-bullet rendering for `docTemplates` on `/pricing`, `/services`, and `src/components/site/PricingSection.tsx` — these read `includeDocTemplates`/`featuresDocTemplates[En]` the same way they already read the doc-generation/doc-review equivalents; add when the user finalizes plan copy alongside real numbers.
- Admin users table (`src/components/admin/admin-dashboard.tsx`) and admin overview stats (`src/app/admin/page.tsx`, `src/components/admin/OverviewPanel.tsx`) surfacing `docTemplatesRemaining` per-user or a templates-usage chart — the existing doc-generation/doc-review counters already aren't editable from the admin user-edit modal (a pre-existing gap noted in the spec), so this isn't a regression, just an existing limitation this plan doesn't newly extend to the 4th counter.
- `src/app/api/user/me/route.ts` exposing `docTemplatesRemaining` — it doesn't expose the existing 2 doc counters either today; fixing that asymmetry for all 3 is a separate small cleanup, not required for anything in this plan to function (the dashboard page reads `user.docTemplatesRemaining` directly from the DB document, not through this API).

## Self-review notes

- **Spec coverage:** every architecture item in the spec (4 pages, 4th quota counter with full touchpoint list, new API route, template content + citations, shared result panel, nav/copy fixes, admin CRUD) maps to a task above. The 3 "out of scope" items were already flagged as lower-priority/pre-existing gaps in the spec itself, not silently dropped.
- **Placeholder scan:** no TBD/TODO/"add error handling" left in any step; Task 6 Step 3 explains directly why no automated test exists for `renderTemplate` in isolation (verified end-to-end instead, in Task 7).
- **Type consistency:** `DocumentResult` (Task 9) is used identically in `generate-client.tsx` (Task 9) and `templates-client.tsx` (Task 10). `TemplateType`/`TEMPLATE_TYPES` (Task 6) matches the enum added to `GenerateTemplateSchema` (Task 7) and the dropdown `value`s in `templates-client.tsx` (Task 10). `renderTemplate(type, answers)`'s signature is identical everywhere it's referenced.
