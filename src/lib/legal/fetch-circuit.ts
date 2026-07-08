/**
 * Circuit breaker for the matsne fetch batch in the chat route. After several
 * consecutive full-batch failures (matsne WAF blocking us, an outage, etc.)
 * we skip straight to the web-search fallback instead of re-attempting every
 * approved source's fetch/retry cycle on a request already doomed to fail —
 * saves matsne load and latency. Resets on any success.
 */

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

type CircuitState = { consecutiveFailures: number; openUntil: number };

declare global {
  var __matsneFetchCircuit: CircuitState | undefined;
}
const state: CircuitState =
  globalThis.__matsneFetchCircuit ??
  (globalThis.__matsneFetchCircuit = { consecutiveFailures: 0, openUntil: 0 });

/** True if the breaker is open — caller should skip fetching and fail fast. */
export function isCircuitOpen(): boolean {
  return state.openUntil > Date.now();
}

/** Call after a fetch batch returns at least one source. */
export function recordFetchSuccess(): void {
  state.consecutiveFailures = 0;
  state.openUntil = 0;
}

/** Call after a fetch batch returns zero sources. */
export function recordFetchFailure(): void {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    state.openUntil = Date.now() + COOLDOWN_MS;
  }
}
