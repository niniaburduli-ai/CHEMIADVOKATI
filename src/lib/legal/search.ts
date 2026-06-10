import type { FetchedSource } from "./fetch-source";

/**
 * Hybrid lexical search over fetched source text. We split each document into
 * article-sized chunks and score them against a WEIGHTED multi-query:
 *   - the user's original wording (weight 1),
 *   - LLM-extracted legal keywords / synonyms (weight 2 — strongest signal),
 *   - an LLM hypothetical answer in legal register (HyDE, weight ~1.2).
 *
 * The keyword + HyDE terms are produced by query-understanding.ts, so a question
 * phrased in everyday language still matches the formal legal text even with no
 * literal word overlap. No embeddings needed (hard rule #4: find relevant legal
 * text from the approved sources).
 */

export type Chunk = {
  url: string;
  /** Law / document name, e.g. "საქართველოს შრომის კოდექსი". */
  lawTitle: string;
  /** Enclosing chapter ("topic"), e.g. "თავი VI. შვებულება", if any. */
  chapter?: string;
  /** Article number, e.g. "მუხლი 32". */
  article: string;
  /** Article heading, e.g. "შვებულების მიცემის წესი", if any. */
  articleTitle?: string;
  /** Combined human label, e.g. "მუხლი 32. შვებულების მიცემის წესი". */
  label: string;
  /** This window's text (used for scoring). */
  text: string;
  /** Stable per-article key (url + article) for aggregation. */
  articleKey: string;
  /** Full article text (capped) — returned to the model so late notes survive. */
  fullText: string;
};

export type ScoredChunk = Chunk & { score: number };

const MIN_TOKEN_LEN = 3;
// Cap retained per article. Generous so a trailing "შენიშვნა" note is included
// in fullText; the model-side cleanChunk later keeps head+tail within budget.
const ARTICLE_CAP = 7000;

// Georgian article marker, e.g. "მუხლი 286" / "მუხლი 153⁶".
// Character class covers full Unicode superscript range (⁰¹²³⁴⁵⁶⁷⁸⁹) so indexed
// articles like 153⁶ or 156¹ are matched as a single label, not truncated at the
// superscript boundary. Previously only ¹²³ (U+00B9/B2/B3) were included, causing
// any article indexed with ⁴–⁹ (U+2074–2079) to be split into two ghost chunks.
const ARTICLE_RE = /მუხლი\s+\d+[¹²³⁴⁵⁶⁷⁸⁹⁰\d.\-–]*/g;
// Chapter ("topic") marker, e.g. "თავი VI. შვებულება".
const CHAPTER_RE = /თავი\s+[IVXLCDM\d¹²³⁴⁵⁶⁷⁸⁹⁰]+\s*\.?\s*[^\n\r]{0,60}/g;
// Strip one or more leading "მუხლი N." duplicates from a heading line.
const ARTICLE_PREFIX_RE = /^(?:მუხლი\s+\d+[¹²³⁴⁵⁶⁷⁸⁹⁰\d.\-–]*\s*\.?\s*)+/;

/** Heading text on the first line of a chunk, minus the "მუხლი N." prefix. */
function extractArticleTitle(chunkText: string): string | undefined {
  const firstLine = chunkText.split(/[\n\r]/)[0] ?? "";
  const title = firstLine.replace(ARTICLE_PREFIX_RE, "").trim();
  return title && title.length <= 120 ? title : undefined;
}

/** Split free text into article-anchored chunks; fall back to paragraph blocks. */
function chunkDocument(src: FetchedSource): Chunk[] {
  const text = src.text;
  const markers: { index: number; label: string }[] = [];
  for (const m of text.matchAll(ARTICLE_RE)) {
    markers.push({ index: m.index ?? 0, label: m[0].replace(/\s+/g, " ").trim() });
  }

  // Chapter positions, so each article can name its enclosing "topic".
  const chapters: { index: number; title: string }[] = [];
  for (const m of text.matchAll(CHAPTER_RE)) {
    chapters.push({ index: m.index ?? 0, title: m[0].replace(/\s+/g, " ").trim() });
  }
  const chapterAt = (pos: number): string | undefined => {
    let found: string | undefined;
    for (const c of chapters) {
      if (c.index <= pos) found = c.title;
      else break;
    }
    return found;
  };

  const chunks: Chunk[] = [];

  if (markers.length === 0) {
    // No article structure — chunk by size on paragraph boundaries.
    const paras = text.split(/\n{2,}/);
    let buf = "";
    let n = 0;
    const push = (t: string) => {
      const body = t.trim();
      if (!body) return;
      chunks.push({
        url: src.url,
        lawTitle: src.title,
        article: src.title,
        label: src.title,
        text: body,
        articleKey: `${src.url}#${n++}`,
        fullText: body.slice(0, ARTICLE_CAP),
      });
    };
    for (const p of paras) {
      if ((buf + "\n\n" + p).length > WINDOW_CHARS && buf) {
        push(buf);
        buf = p;
      } else {
        buf = buf ? `${buf}\n\n${p}` : p;
      }
    }
    push(buf);
    return chunks;
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const body = text.slice(start, end).trim();
    if (!body) continue;
    const article = markers[i].label.replace(/\.$/, "");
    const articleTitle = extractArticleTitle(body);
    const chapter = chapterAt(start);
    const label = articleTitle ? `${article}. ${articleTitle}` : article;
    const articleKey = `${src.url}|${article}`;
    const fullText = body.slice(0, ARTICLE_CAP);

    // Score against overlapping windows (so a rule buried late in a long
    // article still matches the search), but every window carries the whole
    // article's text — searchSources aggregates per article and returns
    // fullText, so trailing "შენიშვნა" notes reach the model intact.
    for (const piece of windows(body)) {
      chunks.push({
        url: src.url,
        lawTitle: src.title,
        chapter,
        article,
        articleTitle,
        label,
        text: piece,
        articleKey,
        fullText,
      });
    }
  }
  return chunks;
}

const WINDOW_CHARS = 1200;
const WINDOW_OVERLAP = 200;
const MAX_WINDOWS = 10;

/** Split a long article body into overlapping windows (or return it whole). */
function windows(body: string): string[] {
  if (body.length <= WINDOW_CHARS) return [body];
  const out: string[] = [];
  let pos = 0;
  while (pos < body.length && out.length < MAX_WINDOWS) {
    out.push(body.slice(pos, pos + WINDOW_CHARS));
    pos += WINDOW_CHARS - WINDOW_OVERLAP;
  }
  return out;
}

/**
 * Georgian is heavily inflected (შვებულება / შვებულებით / შვებულების ...), so
 * exact-substring matching misses most forms. Reduce each token to a stem by
 * dropping trailing case/number endings; the stem substring-matches all forms.
 */
function stem(word: string): string {
  if (word.length >= 8) return word.slice(0, 6);
  if (word.length >= 6) return word.slice(0, 4);
  return word;
}

function tokenize(q: string): string[] {
  return Array.from(
    new Set(
      q
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length >= MIN_TOKEN_LEN)
        .map(stem)
    )
  );
}

// First slice of a chunk holds the article heading, e.g. "მუხლი 31. შვებულების
// ხანგრძლივობა". A stem hit there is a strong on-topic signal.
const TITLE_ZONE_CHARS = 80;
const FREQ_CAP = 3; // low cap so dense repetition can't bury concise articles
const TITLE_WEIGHT = 5;

// Relative weights of the three query channels.
const W_ORIGINAL = 1;
const W_KEYWORD = 2;
const W_HYPOTHETICAL = 1.2;

/** Structured, weighted query. A plain string is treated as `original` only. */
export type SearchQuery = {
  original: string;
  keywords?: string[];
  hypothetical?: string;
};

/**
 * Collapse all three channels into one stem→weight map, keeping the highest
 * weight when the same stem appears in multiple channels (so a term that is both
 * in the question and an extracted keyword scores at the keyword weight, not the
 * sum — prevents double counting).
 */
function buildWeightedStems(query: SearchQuery): Map<string, number> {
  const weighted = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const stem of tokenize(text)) {
      const prev = weighted.get(stem) ?? 0;
      if (weight > prev) weighted.set(stem, weight);
    }
  };
  add(query.original, W_ORIGINAL);
  if (query.hypothetical) add(query.hypothetical, W_HYPOTHETICAL);
  for (const kw of query.keywords ?? []) add(kw, W_KEYWORD);
  return weighted;
}

type ChunkScore = { score: number; distinct: number; titleHit: boolean };

function scoreChunk(
  chunkText: string,
  weightedStems: Map<string, number>
): ChunkScore {
  const hay = chunkText.toLowerCase();
  const title = hay.slice(0, TITLE_ZONE_CHARS);
  let score = 0;
  let distinct = 0;
  let titleHit = false;

  for (const [s, weight] of weightedStems) {
    let from = 0;
    let count = 0;
    for (;;) {
      const idx = hay.indexOf(s, from);
      if (idx === -1) break;
      count++;
      from = idx + s.length;
      if (count >= FREQ_CAP) break;
    }
    if (count > 0) distinct++;
    score += count * weight;
    if (title.includes(s)) {
      score += TITLE_WEIGHT * weight;
      titleHit = true;
    }
  }
  // Reward chunks that hit several distinct terms, not one repeated word.
  return { score: score + distinct * 2, distinct, titleHit };
}

/**
 * Search across all fetched sources, return the top matching ARTICLES.
 *
 * Windows are scored for recall (a rule buried late in a long article still
 * matches), but results are aggregated per article — each returned chunk holds
 * the article's full text, so trailing "შენიშვნა" notes reach the model rather
 * than being lost to whichever single window happened to rank.
 *
 * Returns [] when nothing meaningfully matches (hard rule #7: don't guess).
 */
export function searchSources(
  sources: FetchedSource[],
  query: string | SearchQuery,
  topK = 5
): ScoredChunk[] {
  const q: SearchQuery = typeof query === "string" ? { original: query } : query;
  const weightedStems = buildWeightedStems(q);
  if (weightedStems.size === 0) return [];

  // Best-scoring window per article, plus a small bonus for multiple matching
  // windows (broad relevance across the article).
  const best = new Map<
    string,
    { chunk: Chunk; score: number; hits: number }
  >();
  for (const src of sources) {
    for (const chunk of chunkDocument(src)) {
      const { score, distinct, titleHit } = scoreChunk(chunk.text, weightedStems);
      if (!((titleHit || distinct >= 2) && score >= 3)) continue;
      const prev = best.get(chunk.articleKey);
      if (!prev) {
        best.set(chunk.articleKey, { chunk, score, hits: 1 });
      } else {
        prev.hits += 1;
        if (score > prev.score) {
          prev.score = score;
          prev.chunk = chunk;
        }
      }
    }
  }

  const articles: ScoredChunk[] = [];
  for (const { chunk, score, hits } of best.values()) {
    // Return the FULL article text (not the single matched window).
    articles.push({
      ...chunk,
      text: chunk.fullText,
      score: score + Math.min(hits - 1, 4) * 2,
    });
  }

  // Stable sort (score desc); ties keep document order, so general/foundational
  // articles (which appear earlier in a legal code) rank ahead of later ones.
  articles.sort((a, b) => b.score - a.score);
  return articles.slice(0, topK);
}
