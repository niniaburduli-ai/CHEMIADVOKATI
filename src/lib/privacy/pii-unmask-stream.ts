/** @module pii-unmask-stream
 *
 * Streaming-safe counterpart to unmaskPII: a `[TYPE_n]` token can arrive
 * split across two SSE chunks, so a naive per-chunk replace would leak half
 * a tag to the browser. Buffers only what might still become a tag — same
 * incremental-boundary technique as DelimiterSplitter
 * (src/lib/streaming/delimiter-splitter.ts), but for an open-ended pattern
 * instead of one fixed literal.
 */

import { unmaskPII, type PiiMap } from "./pii-mask";

export class PiiUnmaskStream {
  private buffer = "";
  private readonly map: PiiMap;

  constructor(map: PiiMap) {
    this.map = map;
  }

  /** Feed the next chunk; returns the portion now safe to emit, with every
   * complete tag already replaced by its original value. */
  push(chunk: string): string {
    this.buffer = unmaskPII(this.buffer + chunk, this.map);

    // Hold back from the last unresolved "[" onward — it might still grow
    // into a tag once more chunks arrive. "Unresolved" means no "]" appears
    // after it: a "]" after it means either it was already replaced above,
    // or it's unrelated bracket text that fully closed within this buffer
    // (e.g. a `[LESSOR_NAME]`-style placeholder some prompts already use) —
    // either way there's nothing left to wait for.
    const openIdx = this.buffer.lastIndexOf("[");
    if (openIdx === -1) {
      const safe = this.buffer;
      this.buffer = "";
      return safe;
    }
    const hasClose = this.buffer.indexOf("]", openIdx) !== -1;
    if (hasClose) {
      const safe = this.buffer;
      this.buffer = "";
      return safe;
    }
    const safe = this.buffer.slice(0, openIdx);
    this.buffer = this.buffer.slice(openIdx);
    return safe;
  }

  /** Call once the source stream has ended: final replace pass on whatever
   * is still held back (an unresolved "[" at this point can't be completed
   * by anything more, so it's returned as-is). */
  finish(): string {
    const safe = unmaskPII(this.buffer, this.map);
    this.buffer = "";
    return safe;
  }
}
