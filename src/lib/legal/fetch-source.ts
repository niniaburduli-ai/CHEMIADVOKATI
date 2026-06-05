import { isAllowedHost, isApprovedUrl } from "./sources";

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

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 15_000;

// Survives hot reload in dev; per-instance in prod (fine — it's just a cache).
declare global {
  var __legalSourceCache: Map<string, CacheEntry> | undefined;
}
const cache: Map<string, CacheEntry> =
  globalThis.__legalSourceCache ?? (globalThis.__legalSourceCache = new Map());

function stripHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? decodeEntities(titleMatch[1]).trim() : "";

  let body = html
    // drop non-content elements entirely
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    // keep paragraph/line structure
    .replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  body = decodeEntities(body)
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim();

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ChemiAdvokati/1.0 (+legal-assistant; approved-sources-only)",
        Accept: "text/html",
      },
    });
    if (!res.ok) {
      // Serve stale on failure if we have it; otherwise give up gracefully.
      return cached?.value ?? null;
    }
    const html = await res.text();
    const { title, text } = stripHtml(html);
    const value: FetchedSource = {
      url,
      title: title || fallbackTitle,
      text,
    };
    cache.set(url, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch {
    return cached?.value ?? null;
  } finally {
    clearTimeout(timer);
  }
}
