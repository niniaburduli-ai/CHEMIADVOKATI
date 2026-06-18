# Admin Panel & Dashboard — PRD / Goal

Status: **in progress** · Owner: admin · Scope: extend the existing `/admin` panel.

## Goal

Give a non-technical admin full control over the running SaaS from `/admin`, without code
deploys: appearance (theme/fonts), all page content, raw database records, subscription
plans/pricing, and an analytics overview with charts.

## Existing baseline (already shipped)

- `/admin` (role-gated via `auth` + `middleware.ts`) with a `Tabs` shell.
- CMS: SiteConfig, Nav, Homepage, About, FAQ, Blog, Footer, Legal — admin-edited, frontend reads via `lib/cms.ts`.
- Tables: Users (edit role/plan/quota, delete), Consultations, Generated Docs, Reviews, Files.
- Auth: NextAuth v5 (JWT), `role` claim, `getAdminSession()` for API defense-in-depth.
- Payments: Flitt subscriptions (`lib/flitt.ts`), plans hardcoded in `lib/plans.ts`.

## Requirements → solution

### 1. Theme: colors, font size, font family
- `ThemeConfig` singleton model: light + dark token overrides (primary, foreground,
  background, accent, border, ring, card, destructive), `radius`, `baseFontSize`,
  `fontFamily` (sans/serif/system), heading font.
- `lib/theme.ts` builds a CSS string of `:root{}` / `.dark{}` var overrides.
- Root `layout.tsx` fetches config and injects a `<style>` so overrides win over `globals.css`.
- Multiple Georgian-capable fonts loaded via `next/font`; active one chosen by config.
- `next-themes` wired (ThemeProvider + header light/dark toggle) so both palettes are reachable.
- Admin **Theme** tab: color pickers (light/dark sub-tabs), radius + base-size sliders,
  font select, live preview, Save → `PUT /api/admin/cms/theme` → `revalidatePath("/","layout")`.

### 2 & 3. Manage each page / any text, header, footer, layout
- Covered by existing CMS. Enhancements: header colors become theme-token driven so theme
  edits visibly affect chrome; pricing page becomes CMS/DB-driven (see #5).

### 4. CRUD on any MongoDB collection
- Generic admin DB explorer over a **safelist** of registered Mongoose models.
- `GET /api/admin/db/collections` → names + counts.
- `GET /api/admin/db/[collection]?skip&limit&q` → paginated docs (sensitive fields like
  `passwordHash` stripped).
- `POST /api/admin/db/[collection]` create · `GET/PATCH/DELETE /api/admin/db/[collection]/[id]`.
- Admin **Database** tab: collection picker → rows table → JSON editor dialog (create/edit) + delete with confirm.
- Guardrails: safelist only, no `passwordHash` exposure, confirm on destructive ops.

### 5. Change Flitt pricing / add plans
- `Plan` model: `key` (unique, no `_`), `name`, `nameEn`, `description`, `priceMinor` (GEL minor
  units), `currency`, `period`, `consultations`, `docGeneration`, `docReview`, `features[]`,
  `isFree`, `highlighted`, `visible`, `active`, `order`.
- `lib/plans-db.ts`: `getPlans()`, `getPlanByKey()`, `getPlanLimits()`, `ensurePlansSeeded()`
  (seeds free/standard/premium from current constants on first read; DB is source of truth after).
- Refactor: `flitt.ts` (`createSubscriptionCheckout` reads amount/desc from DB plan;
  `parseOrderId` accepts any key; `planActivationFields` takes limits), checkout route +
  validators validate plan against active DB keys, `user.plan` enum relaxed to `String`.
- Pricing page renders from `getPlans()`.
- Admin **Plans** tab: CRUD via `GET/POST /api/admin/plans`, `PATCH/DELETE /api/admin/plans/[id]`.
- User edit dialog plan select is populated from DB plans.

### 6. shadcn charts on dashboard
- `recharts` + shadcn `components/ui/chart.tsx`.
- `GET /api/admin/stats` aggregates: totals, signups/30d, consultations/30d, plan distribution,
  est. monthly revenue from active subscriptions.
- Admin **Overview** tab (default): stat cards + area/bar/donut charts.

## Admin tab order (after this work)
Overview · Users · Consultations · Documents · Reviews · Files · Content (CMS) · Theme · Plans · Database

## Non-goals
- Per-field visual page builder beyond existing CMS forms.
- Multi-currency / proration / invoice PDFs.
- Real-time analytics streaming.

## Acceptance
- `npm run build` + `npm run lint` clean.
- Each new tab loads, reads, writes, and reflects changes on the public site after save.
- No plan hardcoding remains on the critical path (checkout, pricing, activation read DB).
