import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    // Plan is a DB-backed plan key (see models/Plan.ts) — no fixed enum.
    plan: { type: String, default: "free", index: true },
    // Basic (free) plan's one-time lifetime allowance — granted once at
    // account creation, decremented on use, never refilled/reset (see
    // plan-expiry.ts and flitt.ts planDeactivationFields, which deliberately
    // leave these untouched when reverting a paid/comp plan back to free).
    consultationsRemaining: { type: Number, default: 9 },
    docGenerationRemaining: { type: Number, default: 3 },
    docReviewRemaining: { type: Number, default: 1 },
    docTemplatesRemaining: { type: Number, default: 20 },
    resetAt: { type: Date },
    // Set only for admin-assigned plans (see planDurationMonths in the admin
    // PATCH route) — the plan auto-reverts to free once this date passes
    // (checked lazily in applyPlanExpiryIfDue, there's no cron). Null/unset
    // for free accounts and for real Flitt subscriptions (those renew/expire
    // via subscriptionStatus + resetAt instead).
    planExpiresAt: { type: Date, default: null },
    // Custom "build your own" one-time package — fully independent of the
    // subscription above (plan/planExpiresAt/subscriptionStatus). A user can
    // hold an active subscription AND an active custom package at the same
    // time; buying a custom package never touches the fields above. See
    // lib/plan-expiry.ts (applyCustomPlanExpiryIfDue) and lib/quota.ts.
    customConsultationsRemaining: { type: Number, default: 0 },
    customDocGenerationRemaining: { type: Number, default: 0 },
    customDocReviewRemaining: { type: Number, default: 0 },
    customDocTemplatesRemaining: { type: Number, default: 0 },
    // Set on successful custom-package purchase; null/unset when no custom
    // package is active. A repeat purchase while still active adds to the
    // remaining quotas above and resets this to a fresh 30 days.
    customPlanExpiresAt: { type: Date, default: null },
    // Bookkeeping only for the custom order's own pending/callback state —
    // kept separate from flittOrderId/flittPaymentId so a concurrent custom
    // purchase can never corrupt an in-flight or active subscription's own
    // callback state.
    customFlittOrderId: { type: String, default: "" },
    customFlittPaymentId: { type: String, default: "" },
    // Flitt Payments subscription state.
    flittOrderId: { type: String, index: true },
    flittPaymentId: { type: String },
    subscriptionStatus: { type: String, default: "" }, // pending | active | declined | expired | reversed
    // Set whenever subscriptionStatus changes (see planActivationFields/
    // planDeactivationFields in lib/flitt.ts) — anchors the cron reminder
    // job's dedupe checks (renewalReminderSentFor / retryReminderSentFor
    // below) to a specific status transition instead of wall-clock time.
    subscriptionStatusChangedAt: { type: Date, default: null },
    // Dedupe for the "payment due tomorrow" cron reminder: stores the
    // `resetAt` value a reminder was already sent for, so a daily cron run
    // doesn't re-send until the next renewal cycle.
    renewalReminderSentFor: { type: Date, default: null },
    // Dedupe for the next-day "payment failed, please retry" cron reminder:
    // stores the `subscriptionStatusChangedAt` value already reminded for.
    retryReminderSentFor: { type: Date, default: null },
    // True when a non-free `plan` was set directly by an admin (support/comp
    // account), not by a real Flitt payment — kept out of "active
    // subscriptions"/revenue stats (see api/admin/stats) so comp accounts
    // never inflate real numbers. Cleared to false by any real payment
    // activation/deactivation (see planActivationFields/planDeactivationFields
    // in lib/flitt.ts) so the account correctly counts as real once it pays.
    planGrantedByAdmin: { type: Boolean, default: false },
    consentAcceptedAt: { type: Date },
    consentVersion: { type: String, default: "" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: unknown };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
