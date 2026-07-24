/** @module openrouter-usage
 *
 * OpenRouter includes the real dollar cost it billed for a call as
 * `usage.cost` (USD — OpenRouter credits are 1:1 with USD) on every response
 * by default, streaming or not — no request-body opt-in needed.
 *
 * Deliberately do NOT add `usage: { include: true }` to request bodies: it's
 * unnecessary (cost is already present without it, confirmed empirically —
 * see docs/superpowers/plans/2026-07-24-ai-cost-tracking.md's fix-up notes),
 * and on streaming requests it makes at least Gemini models buffer the
 * entire response before sending the first byte (~1s -> ~15s time-to-first-
 * chunk observed), which defeats live streaming and reads as the assistant
 * hanging. Shared by every call site so the parsing isn't duplicated.
 */

/** Extract the billed cost (USD) from an OpenRouter response body. Returns 0
 * (never throws) if the field is missing — a fail-open default, since a
 * missing cost should never break the feature that triggered the call. */
export function extractCostUsd(json: unknown): number {
  const usage = (json as { usage?: { cost?: number } })?.usage;
  return typeof usage?.cost === "number" ? usage.cost : 0;
}
