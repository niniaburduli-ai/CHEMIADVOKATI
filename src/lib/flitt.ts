/**
 * Flitt Payments integration (docs.flitt.com).
 *
 * Subscriptions use Flitt "protocol 2.0": the whole order (including the nested
 * recurring_data) is JSON→base64-encoded and the signature is sha1(secret|data).
 * This sidesteps Flitt's flat SHA1 scheme, which cannot sign nested objects.
 *
 * Credentials come from env (FLITT_*) — never hardcoded.
 */
import { createHash } from "crypto";
import type { PlanLimits } from "./plans-db";

const CHECKOUT_URL = "https://pay.flitt.com/api/checkout/url/";
const SUBSCRIPTION_URL = "https://pay.flitt.com/api/subscription";

/** A plan key (e.g. "standard"). Plans are now DB-backed and dynamic. */
export type PlanKey = string;

/** Minimal plan shape needed to start a checkout. */
export type CheckoutPlan = {
  key: PlanKey;
  name: string;
  priceMinor: number;
  period?: string;
};

function merchantId(): number {
  const id = process.env.FLITT_MERCHANT_ID;
  if (!id) throw new Error("FLITT_MERCHANT_ID is not set");
  return Number(id);
}
function paymentKey(): string {
  const k = process.env.FLITT_PAYMENT_KEY;
  if (!k) throw new Error("FLITT_PAYMENT_KEY is not set");
  return k;
}

/**
 * True when the configured FLITT_PAYMENT_KEY is Flitt's publicly-documented
 * sandbox/test secret ("test") rather than a real merchant's live secret.
 * A validly-signed sandbox callback is indistinguishable from a live one by
 * signature alone — this is the ONLY reliable signal that a callback came
 * through Flitt's test environment, and it must never be trusted to grant
 * real subscription quota (see the callback route's hard gate on this).
 */
export function isSandboxCredentials(): boolean {
  return process.env.FLITT_PAYMENT_KEY === "test";
}
function appUrl(): string {
  return (process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

const sha1 = (s: string) => createHash("sha1").update(s, "utf8").digest("hex");

/** Protocol-2.0 signature over the base64 payload: sha1(secret|data). */
function signV2(data: string, secret: string): string {
  return sha1(`${secret}|${data}`);
}

/** Flat protocol-1.0 signature: sha1(secret|sorted non-empty scalar values). */
export function signV1(params: Record<string, unknown>, secret: string): string {
  const values = Object.keys(params)
    .sort()
    .filter(
      (k) =>
        k !== "signature" &&
        k !== "response_signature_string" &&
        params[k] !== "" &&
        params[k] != null
    )
    .map((k) => String(params[k]));
  return sha1([secret, ...values].join("|"));
}

/** order_id encodes plan + user so the callback can map back without lookups. */
export function buildOrderId(plan: PlanKey, userId: string): string {
  return `sub_${plan}_${userId}_${Date.now()}`;
}
export function parseOrderId(orderId: string): { plan: PlanKey | null; userId: string | null } {
  // plan keys are [a-z0-9-]+ (no underscore — that is the delimiter); userId is a
  // Mongo ObjectId hex string. Anything else returns nulls.
  const m = /^sub_([a-z0-9-]+)_([0-9a-fA-F]+)_\d+$/.exec(orderId || "");
  return m ? { plan: m[1], userId: m[2] } : { plan: null, userId: null };
}

/** order_id for a one-time custom-package purchase (no plan key — quantities travel in merchant_data). */
export function buildCustomOrderId(userId: string): string {
  return `custom_${userId}_${Date.now()}`;
}
export function isCustomOrderId(orderId: string): boolean {
  return orderId.startsWith("custom_");
}
export function parseCustomOrderId(orderId: string): { userId: string | null } {
  const m = /^custom_([0-9a-fA-F]+)_\d+$/.exec(orderId || "");
  return { userId: m ? m[1] : null };
}

export type CheckoutResult = { checkoutUrl: string; orderId: string; paymentId?: string };

/**
 * Create a Flitt subscription checkout (protocol 2.0) and return the hosted
 * checkout URL. Throws on provider/transport error.
 */
export async function createSubscriptionCheckout(
  plan: CheckoutPlan,
  user: { id: string; email: string; name?: string | null }
): Promise<CheckoutResult> {
  const amount = plan.priceMinor;
  const orderId = buildOrderId(plan.key, user.id);

  const order = {
    order_id: orderId,
    order_desc: `${plan.name} (თვიური)`,
    merchant_id: merchantId(),
    currency: "GEL",
    amount,
    subscription: "Y",
    // state "hidden": subscription is enabled but the recurring calendar
    // (amount / count / interval) is NOT shown or editable on checkout.
    recurring_data: { amount, period: "month", every: 1, quantity: 120, state: "hidden" },
    server_callback_url: `${appUrl()}/api/flitt/callback`,
    response_url: `${appUrl()}/billing?status=success`,
    merchant_data: JSON.stringify({ userId: user.id, plan: plan.key }),
    sender_email: user.email,
    lang: "ka",
  };

  const data = Buffer.from(JSON.stringify({ order }), "utf8").toString("base64");
  const body = { request: { version: "2.0", data, signature: signV2(data, paymentKey()) } };

  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const respData = json?.response?.data;
  if (!respData) {
    const msg = json?.response?.error_message || "Unknown Flitt error";
    throw new Error(`Flitt checkout failed: ${msg}`);
  }
  const decoded = JSON.parse(Buffer.from(respData, "base64").toString("utf8"));
  const inner = decoded?.order ?? decoded?.response ?? decoded;
  if (!inner?.checkout_url) throw new Error("Flitt response missing checkout_url");
  return { checkoutUrl: inner.checkout_url, orderId, paymentId: inner.payment_id };
}

export type OneTimeCheckoutItem = {
  orderId: string;
  description: string;
  amountMinor: number;
  merchantData: Record<string, unknown>;
};

/**
 * Create a one-time (non-recurring) Flitt checkout — no `subscription`/
 * `recurring_data`, unlike createSubscriptionCheckout. Used for the custom
 * "build your own" package, which is explicitly a single charge with no
 * auto-renewal.
 */
export async function createOneTimeCheckout(
  item: OneTimeCheckoutItem,
  user: { id: string; email: string; name?: string | null }
): Promise<CheckoutResult> {
  const order = {
    order_id: item.orderId,
    order_desc: item.description,
    merchant_id: merchantId(),
    currency: "GEL",
    amount: item.amountMinor,
    server_callback_url: `${appUrl()}/api/flitt/callback`,
    response_url: `${appUrl()}/billing?status=success`,
    merchant_data: JSON.stringify(item.merchantData),
    sender_email: user.email,
    lang: "ka",
  };

  const data = Buffer.from(JSON.stringify({ order }), "utf8").toString("base64");
  const body = { request: { version: "2.0", data, signature: signV2(data, paymentKey()) } };

  const res = await fetch(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const respData = json?.response?.data;
  if (!respData) {
    const msg = json?.response?.error_message || "Unknown Flitt error";
    throw new Error(`Flitt checkout failed: ${msg}`);
  }
  const decoded = JSON.parse(Buffer.from(respData, "base64").toString("utf8"));
  const inner = decoded?.order ?? decoded?.response ?? decoded;
  if (!inner?.checkout_url) throw new Error("Flitt response missing checkout_url");
  return { checkoutUrl: inner.checkout_url, orderId: item.orderId, paymentId: inner.payment_id };
}

export type CallbackData = {
  order_id?: string;
  payment_id?: string | number;
  order_status?: string;
  response_status?: string;
  merchant_data?: string;
  [k: string]: unknown;
};

/**
 * Verify a Flitt server callback and return its parsed params. Handles both the
 * protocol-2.0 envelope ({version,data,signature}) and flat protocol-1.0 params.
 * Returns null when the signature is invalid.
 */
export function verifyCallback(raw: unknown): CallbackData | null {
  const secret = paymentKey();
  let body = raw as Record<string, unknown>;
  if (body && typeof body === "object" && body.request && typeof body.request === "object") {
    body = body.request as Record<string, unknown>;
  }
  if (!body || typeof body !== "object") return null;

  // Protocol 2.0: base64 data + sha1(secret|data) signature.
  if (typeof body.data === "string" && typeof body.signature === "string") {
    if (signV2(body.data, secret) !== body.signature) return null;
    try {
      const dec = JSON.parse(Buffer.from(body.data, "base64").toString("utf8"));
      return (dec?.order ?? dec?.response ?? dec) as CallbackData;
    } catch {
      return null;
    }
  }

  // Protocol 1.0: flat params with a signature field.
  const sig = body.signature;
  if (typeof sig !== "string") return null;
  if (signV1(body, secret) !== sig) return null;
  return body as CallbackData;
}

export const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

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
    // A real payment always wins over a prior admin comp grant — this
    // account should count as real revenue going forward.
    planGrantedByAdmin: false,
    subscriptionStatusChangedAt: new Date(),
  };
}

/**
 * Fields set when a subscription ends — drop back to the free tier.
 * Deliberately does NOT refill *Remaining quota — the Basic (free) plan is a
 * one-time lifetime allowance granted once at account creation, never reset.
 * Whatever quota is left over from the paid plan simply carries over.
 */
export function planDeactivationFields(status: string) {
  return {
    plan: "free" as const,
    subscriptionStatus: status,
    planGrantedByAdmin: false,
    subscriptionStatusChangedAt: new Date(),
  };
}

/** Stop an existing subscription (protocol 1.0 flat signature). */
export async function stopSubscription(orderId: string): Promise<boolean> {
  const params = { order_id: orderId, merchant_id: merchantId(), action: "stop" };
  const signature = signV1(params, paymentKey());
  const res = await fetch(SUBSCRIPTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request: { ...params, signature } }),
  });
  const json = await res.json().catch(() => ({}));
  return json?.response?.response_status === "success";
}
