/** @module chat-protocol
 *
 * Wire protocol for streaming chat/generate responses: plain prose bytes,
 * plus two rare in-band control markers threaded through the same text
 * body (no custom headers, since headers must be committed before we know
 * things like legal-basis citations — those only exist once generation has
 * finished, i.e. after the body has already started streaming):
 *
 *  - RESET: an in-progress answer is being discarded and restarted (e.g.
 *    chat's cheap-model draft failed the groundedness check and is being
 *    replaced by the escalation model's answer). Rare — only fires on retry.
 *  - META: always the last thing sent. Everything after it to the end of
 *    the stream is one JSON payload (legal basis, web sources, doc id/title,
 *    or an in-band error when generation fails after some prose already
 *    streamed).
 *
 * Isomorphic: `encodeReset`/`encodeMeta` run server-side inside the route's
 * ReadableStream; `ChatStreamReader` runs client-side over the fetch body
 * reader. Both markers are detected via `DelimiterSplitter`, chained one
 * after the other (META outermost, RESET innermost) so either one is caught
 * correctly even when a network chunk boundary splits it in half.
 */

import { DelimiterSplitter } from "./delimiter-splitter";

const RESET_MARKER = "  STREAM_RESET  ";
const META_MARKER = "  STREAM_META  ";

export function encodeReset(): string {
  return RESET_MARKER;
}

export function encodeMeta(data: unknown): string {
  return META_MARKER + JSON.stringify(data);
}

export type ChatStreamEvent =
  | { type: "prose"; text: string }
  | { type: "reset" }
  | { type: "meta"; data: unknown };

/**
 * Incrementally decodes raw text chunks into prose/reset/meta events.
 * Feed every chunk via `push`, then call `finish` once the stream ends.
 */
export class ChatStreamReader {
  private metaSplit = new DelimiterSplitter(META_MARKER);
  private resetSplit = new DelimiterSplitter(RESET_MARKER);
  private inMeta = false;
  private metaBuffer = "";

  push(rawChunk: string): ChatStreamEvent[] {
    if (this.inMeta) {
      this.metaBuffer += rawChunk;
      return [];
    }

    const events: ChatStreamEvent[] = [];
    const beforeMeta = this.metaSplit.push(rawChunk);
    events.push(...this.pushProse(beforeMeta));
    if (this.metaSplit.matched) {
      // META has definitively ended the prose segment — flush whatever the
      // reset-splitter was still holding back (a partial-match suffix that
      // can now never resolve into a real RESET_MARKER) before switching
      // over to meta-JSON accumulation.
      const { prose } = this.resetSplit.finish();
      if (prose) events.push({ type: "prose", text: prose });
      this.inMeta = true;
      this.metaBuffer = this.metaSplit.tailText;
    }
    return events;
  }

  private pushProse(chunk: string): ChatStreamEvent[] {
    if (!chunk) return [];
    const events: ChatStreamEvent[] = [];
    let rest = chunk;
    for (;;) {
      const safe = this.resetSplit.push(rest);
      if (safe) events.push({ type: "prose", text: safe });
      if (!this.resetSplit.matched) break;
      // Delimiter (RESET) was consumed — emit the reset event, start a fresh
      // splitter for the next segment, and loop in case more text (or
      // another reset) follows within the same chunk.
      const tail = this.resetSplit.tailText;
      events.push({ type: "reset" });
      this.resetSplit = new DelimiterSplitter(RESET_MARKER);
      rest = tail;
      if (!rest) break;
    }
    return events;
  }

  /** Call once the underlying stream has closed. May emit a final prose
   * event (neither marker ever appeared) or the parsed meta payload. */
  finish(): ChatStreamEvent[] {
    if (this.inMeta) {
      try {
        return [{ type: "meta", data: JSON.parse(this.metaBuffer) }];
      } catch {
        return [{ type: "meta", data: null }];
      }
    }
    // META never arrived — flush whatever the META splitter was holding
    // back, then whatever the prose/reset stage was holding back.
    const leftoverBeforeMeta = this.metaSplit.finish().prose;
    const events = this.pushProse(leftoverBeforeMeta);
    const { prose } = this.resetSplit.finish();
    if (prose) events.push({ type: "prose", text: prose });
    return events;
  }
}
