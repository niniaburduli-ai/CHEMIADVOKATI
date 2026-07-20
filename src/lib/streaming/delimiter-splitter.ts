/** @module delimiter-splitter
 *
 * Incremental, boundary-safe splitting on a literal delimiter string for a
 * chunked text stream (LLM tokens or our own protocol markers). Chunk
 * boundaries never align with the delimiter, so a naive `chunk.includes(delim)`
 * check misses matches split across two chunks — this holds back the tail
 * that could be a partial delimiter prefix until enough text has arrived to
 * either confirm or rule out a match.
 *
 * Pure string logic, no Node/browser-only APIs — used both server-side
 * (splitting an LLM's prose from its trailing citation block) and
 * client-side (splitting our reset/meta protocol markers out of the chat
 * stream).
 */

export class DelimiterSplitter {
  private buffer = "";
  private matchedFlag = false;
  private tail = "";

  constructor(private readonly delimiter: string) {}

  /** True once `push` has consumed the delimiter. */
  get matched(): boolean {
    return this.matchedFlag;
  }

  /** Everything received after the delimiter was consumed (only meaningful once `matched`). */
  get tailText(): string {
    return this.tail;
  }

  /** Feed the next chunk; returns the portion now safe to emit (never includes
   * the delimiter or anything after it). Once the delimiter has been seen,
   * returns "" and instead accumulates everything into `tail`. */
  push(chunk: string): string {
    if (this.matchedFlag) {
      this.tail += chunk;
      return "";
    }
    this.buffer += chunk;
    const idx = this.buffer.indexOf(this.delimiter);
    if (idx !== -1) {
      const safe = this.buffer.slice(0, idx);
      this.tail = this.buffer.slice(idx + this.delimiter.length);
      this.matchedFlag = true;
      this.buffer = "";
      return safe;
    }
    const holdLen = Math.min(this.delimiter.length - 1, this.buffer.length);
    const safeLen = this.buffer.length - holdLen;
    if (safeLen <= 0) return "";
    const safe = this.buffer.slice(0, safeLen);
    this.buffer = this.buffer.slice(safeLen);
    return safe;
  }

  /** Call once the source stream has ended. Returns any remaining safe text
   * (the delimiter never showed up) plus whatever landed in `tail`. */
  finish(): { prose: string; tail: string; matched: boolean } {
    return { prose: this.buffer, tail: this.tail, matched: this.matchedFlag };
  }
}
