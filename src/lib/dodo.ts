/**
 * Dodo Payments integration helpers: a lazily-built SDK client (so a missing key
 * doesn't crash the build), the plan ↔ product-id mapping, and a helper that
 * applies a plan's quota to a user when a subscription becomes active.
 */
import DodoPayments from "dodopayments";
import { PLAN_LIMITS, type Plan } from "./plans";

/** Paid plans that map to a Dodo subscription product. */
export type PaidPlan = Exclude<Plan, "free">;

/** Plan → product id, from env (set per environment / test vs live). */
function productEnv(plan: PaidPlan): string | undefined {
  return plan === "standard"
    ? process.env.DODO_PRODUCT_STANDARD
    : process.env.DODO_PRODUCT_PREMIUM;
}

/** Resolve the Dodo product id for a paid plan, or throw if unconfigured. */
export function productIdForPlan(plan: PaidPlan): string {
  const id = productEnv(plan);
  if (!id) throw new Error(`No Dodo product id configured for plan "${plan}"`);
  return id;
}

/** Reverse lookup: which plan a product id belongs to (null if unknown). */
export function planForProductId(productId: string | undefined | null): PaidPlan | null {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_STANDARD) return "standard";
  if (productId === process.env.DODO_PRODUCT_PREMIUM) return "premium";
  return null;
}

let client: DodoPayments | null = null;

/** Lazily construct the SDK client; throws only when actually used without a key. */
export function getDodoClient(): DodoPayments {
  if (client) return client;
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) throw new Error("DODO_PAYMENTS_API_KEY is not set");
  const environment =
    process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
  client = new DodoPayments({ bearerToken: apiKey, environment });
  return client;
}

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** Fields set on a user when a paid plan activates (quota reset for the period). */
export function planActivationFields(plan: PaidPlan) {
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    subscriptionStatus: "active",
    consultationsRemaining: limits.consultations,
    docGenerationRemaining: limits.docGeneration,
    docReviewRemaining: limits.docReview,
    resetAt: new Date(Date.now() + PERIOD_MS),
  };
}

/** Fields set when a subscription ends — drop the user back to the free tier. */
export function planDeactivationFields(status: string) {
  const limits = PLAN_LIMITS.free;
  return {
    plan: "free" as const,
    subscriptionStatus: status,
    consultationsRemaining: limits.consultations,
    docGenerationRemaining: limits.docGeneration,
    docReviewRemaining: limits.docReview,
    resetAt: new Date(Date.now() + PERIOD_MS),
  };
}
