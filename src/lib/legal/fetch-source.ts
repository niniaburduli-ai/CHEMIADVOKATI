import { isAllowedHost, isApprovedUrl, stripCitations } from "./sources";

/**
 * Fetches an approved Matsne source, strips it to plain text, and caches the
 * result in memory with a TTL so we don't hammer matsne.gov.ge on every query.
 *
 * Guards (hard rule #1: never fetch any other website):
 *  - URL must be an approved source AND on the allowed host.
 */

export type FetchedSource = {
  url: string;
  title: string;
  text: string;
};

type CacheEntry = { value: FetchedSource; expires: number };

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — law text changes rarely; avoid hammering matsne
const FETCH_TIMEOUT_MS = 30_000; // matsne law pages can be 5–8 MB
const MAX_ATTEMPTS = 2; // matsne's WAF returns flaky "Access Denied" stubs
const RETRY_DELAY_MS = 600;
const MIN_DOC_CHARS = 400; // shorter than this ⇒ not a real law page

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * matsne occasionally answers with an HTTP 200 "Access Denied" / error stub
 * instead of the document. Reject anything that doesn't look like a law page so
 * we never cache or serve garbage.
 */
function looksLikeLaw(text: string): boolean {
  if (text.length < MIN_DOC_CHARS) return false;
  if (!/მუხლი/.test(text)) return false;
  if (/Access Denied|could not be accessed|Something went wrong/i.test(text)) {
    return false;
  }
  return true;
}

// Survives hot reload in dev; per-instance in prod (fine — it's just a cache).
declare global {
  var __legalSourceCache: Map<string, CacheEntry> | undefined;
}
const cache: Map<string, CacheEntry> =
  globalThis.__legalSourceCache ?? (globalThis.__legalSourceCache = new Map());

// Maps ASCII digit chars to their Unicode superscript equivalents.
// Used to survive matsne's <sup>N</sup> encoding of indexed articles (153⁶, 156¹…).
const SUP_MAP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³",
  "4": "⁴", "5": "⁵", "6": "⁶",
  "7": "⁷", "8": "⁸", "9": "⁹",
};
const supToUnicode = (digits: string) =>
  digits.split("").map((d) => SUP_MAP[d] ?? d).join("");

function stripHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  let body = html
    // drop non-content elements entirely
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    // Preserve indexed-article superscripts BEFORE all other tags are stripped.
    // matsne encodes "153⁶" as "153<sup>6</sup>"; without this the article label
    // becomes "153  6  " which ARTICLE_RE fails to match.
    .replace(/<sup>(\d+)<\/sup>/gi, (_, d: string) => supToUnicode(d))
    // keep paragraph/line structure
    .replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  body = decodeEntities(body)
    .replace(/[^\S\r\n]+/g, " ") // collapse spaces/tabs, keep newlines
    // matsne pages pad articles with long runs of blank lines — collapse any
    // run of (whitespace) newlines to a single paragraph break so real content
    // isn't pushed past the chunk size limit.
    .replace(/(?:[ \t]*\r?\n){2,}/g, "\n\n")
    .replace(/[ \t]*\r?\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();

  // Drop amendment-citation / publication noise that bloats articles.
  body = stripCitations(body).replace(/\n{2,}/g, "\n\n").trim();

  return { title: rawTitle, text: body };
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  copy: "©",
  reg: "®",
  deg: "°",
  middot: "·",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

export async function fetchApprovedSource(
  url: string,
  fallbackTitle: string
): Promise<FetchedSource | null> {
  // HARD RULE: refuse anything not on the approved list / allowed host.
  if (!isApprovedUrl(url) || !isAllowedHost(url)) {
    throw new Error(`Refused to fetch non-approved URL: ${url}`);
  }

  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  // Retry a couple of times — matsne's WAF intermittently denies requests.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ka,en;q=0.8",
        },
      });
      if (res.ok) {
        const html = await res.text();
        const { title, text } = stripHtml(html);
        // Only cache/serve content that actually looks like a law page.
        if (looksLikeLaw(text)) {
          const value: FetchedSource = { url, title: title || fallbackTitle, text };
          cache.set(url, { value, expires: Date.now() + TTL_MS });
          return value;
        }
      }
    } catch {
      // timeout / network error — fall through to retry
    } finally {
      clearTimeout(timer);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }

  // All attempts failed or returned a non-law page: serve stale if we have it.
  return cached?.value ?? null;
}
