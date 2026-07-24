/** @module openrouter-usage
 *
 * OpenRouter's Usage Accounting feature: adding `usage: { include: true }` to
 * a chat-completions request body makes OpenRouter return the real dollar
 * cost it billed for that exact call, as `usage.cost` (USD — OpenRouter
 * credits are 1:1 with USD). Shared by every non-streaming call site so the
 * parsing isn't duplicated across files.
 */

/** Extract the billed cost (USD) from an OpenRouter response body. Returns 0
 * (never throws) if the field is missing — a fail-open default, since a
 * missing cost should never break the feature that triggered the call. */
export function extractCostUsd(json: unknown): number {
  const usage = (json as { usage?: { cost?: number } })?.usage;
  return typeof usage?.cost === "number" ? usage.cost : 0;
}
