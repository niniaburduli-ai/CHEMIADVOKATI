# Custom "Build Your Own" Plan — Design

## Goal

A 4th pricing option alongside Free/Standard/Premium: users pick their own quantity
for each of the 4 services (consultations, ready-made templates, document
generation, document analysis) independently — 1, 2, 3, or all 4 — see the price
update instantly, then pay once. Valid 30 calendar days, no auto-renew.

## Steps and quantities

All 4 services share the same 5 selectable quantities: **10, 50, 100, 200, 300**.
Only these 5 values are selectable (discrete slider, not free numeric entry). A
service can also be fully excluded (quantity 0 / not purchased).

At least one service must have a non-zero quantity to check out.

## Pricing table

Real per-unit AI cost (Gemini Flash/Flash-Lite calls, occasional web-search/Haiku
fallback) is a few tetri at most — negligible. The real constraint on "not losing
money" is Flitt's per-transaction fee and support overhead on very small
purchases, not compute cost. Table below prices well above real cost, with a 9 ₾
minimum single-service purchase as a floor above transaction fees, and volume
discount (decreasing ₾/unit) at higher quantities, consistent with the existing
Standard/Premium tiers:

| Qty | Consultations | Templates | Doc Generation | Doc Analysis |
|-----|---|---|---|---|
| 10 | 9 ₾ | 9 ₾ | 12 ₾ | 15 ₾ |
| 50 | 29 ₾ | 19 ₾ | 39 ₾ | 49 ₾ |
| 100 | 49 ₾ | 29 ₾ | 65 ₾ | 79 ₾ |
| 200 | 79 ₾ | 45 ₾ | 109 ₾ | 129 ₾ |
| 300 | 99 ₾ | 59 ₾ | 139 ₾ | 169 ₾ |

Total price = sum of the step-price for every included service (excluded
service contributes 0). Min possible purchase: 9 ₾. Max (all 4 at 300): 466 ₾.

These prices are admin-editable after launch (see Admin section) — this table is
the initial seed, not a hardcoded constant.

## Data model

### `CustomPlanRates` (new singleton, mirrors `FeatureFlags` pattern)

One document holding the current step-price table:

```
consultations:  { s10, s50, s100, s200, s300 }  // GEL minor units (tetri)
docTemplates:   { s10, s50, s100, s200, s300 }
docGeneration:  { s10, s50, s100, s200, s300 }
docReview:      { s10, s50, s100, s200, s300 }
```

The 5 step quantities themselves (10/50/100/200/300) are a shared code constant,
not stored per-service — only prices are admin-editable, the quantity ladder is
fixed.

### User plan fields (existing `User` model — no schema change needed)

Custom plan reuses the existing `plan`, `*Remaining`, `planExpiresAt`,
`subscriptionStatus` fields exactly like a paid Flitt plan:
- `plan = "custom"`
- `consultationsRemaining` / `docGenerationRemaining` / `docReviewRemaining` /
  `docTemplatesRemaining` = the purchased quantities (0 for excluded services)
- `planExpiresAt = now + 30 days`
- `subscriptionStatus = "active"`

Expiry reuses `applyPlanExpiryIfDue` unchanged — it already reverts any non-free
user whose `planExpiresAt` has passed back to `free`, with no special-casing
needed for `plan === "custom"`.

## Payment flow (one-time, not recurring)

- New `createOneTimeCheckout()` in `lib/flitt.ts` — same Flitt checkout API as
  `createSubscriptionCheckout`, but `subscription: "N"` and no `recurring_data`
  block.
- New order-id scheme: `custom_<userId>_<timestamp>` (parallel to the existing
  `sub_<plan>_<userId>_<timestamp>`). Selected quantities travel in
  `merchant_data` as JSON (`{userId, consultations, docTemplates, docGeneration,
  docReview}`) since there's no plan `key` to look up server-side for a custom
  order.
- New route `POST /api/checkout/custom`: validates each quantity is 0 or one of
  the 5 steps, requires at least one non-zero, computes the total **server-side**
  from `CustomPlanRates` (client-submitted price is never trusted), calls
  `createOneTimeCheckout`, persists the pending order on the user record
  (`flittOrderId`, `flittPaymentId`, `subscriptionStatus: "pending"`) exactly like
  `/api/checkout` does today.
- `/api/flitt/callback` extended: branch on the `custom_` order-id prefix
  (`parseOrderId` gets a sibling `parseCustomOrderId`). On successful payment,
  read quantities back from `merchant_data`, set the user fields listed above.
  On failure/decline, leave the user on their current plan (same as today's
  behavior for regular subscriptions).
- No recurring billing, no Flitt subscription object created — this is a single
  charge.

## Quota consumption

No changes. Chat/generate/review/templates routes already decrement
`*Remaining` regardless of `plan` value — `"custom"` is just another string in
that field.

## UI — the builder card

New 4th card on `/pricing`, alongside Free/Standard/Premium, replacing the
static price/CTA with an interactive builder:

- One row per service (Consultations, Templates, Doc Generation, Doc Analysis):
  a toggle (include/exclude) + a 5-position discrete slider (shadcn `Slider`,
  snapped to `[10,50,100,200,300]`, not continuous — matches your confirmed
  choice).
- A live total price, recomputed client-side on every change from a rate table
  fetched once on page load (new lightweight `GET /api/custom-plan-rates`,
  public). No network round-trip per interaction — instant per your requirement.
- "Build & Pay" button, disabled until at least one service is toggled on.
  Clicking posts the 4 quantities to `/api/checkout/custom` and redirects to the
  returned Flitt checkout URL, same pattern as the existing `UpgradeButton`.
- Card must be rebuilt/re-selected every time (no saved draft) — this is
  explicitly a one-time, one-shot purchase per your requirement ("user must
  create this plan each time").

## Admin

New section in the admin dashboard (next to `PlansPanel`), following the
`FeaturesPanel` singleton-save pattern: a 4×5 grid of GEL price inputs (one per
service × step), save button, no other configuration (the quantity ladder
itself is not admin-editable, only prices).

## Out of scope

- Multi-currency (stays GEL like the rest of the app).
- Auto-renewal of the custom plan (explicitly one-time).
- Editable quantity ladder (fixed at 10/50/100/200/300 in code).
- Proration/refund flows if a user later upgrades away from an active custom
  plan (same as existing behavior — not handled for Standard/Premium either).
