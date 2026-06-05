import type { FetchedSource } from "./fetch-source";

/**
 * Lightweight keyword search over fetched source text. No embeddings: we split
 * each document into article-sized chunks and score them by how many query
 * keywords they contain. Good enough to feed only the relevant slices to the
 * model (hard rule #4: find relevant legal text from the approved sources).
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
  text: string;
};

export type ScoredChunk = Chunk & { score: number };

const MIN_TOKEN_LEN = 3;
const MAX_CHUNK_CHARS = 900;

// Georgian article marker, e.g. "მუხლი 286" / "მუხლი 1421".
const ARTICLE_RE = /მუხლი\s+\d+[¹²³\d.\-–]*/g;
// Chapter ("topic") marker, e.g. "თავი VI. შვებულება".
const CHAPTER_RE = /თავი\s+[IVXLCDM\d¹²³]+\s*\.?\s*[^\n\r]{0,60}/g;
// Strip one or more leading "მუხლი N." duplicates from a heading line.
const ARTICLE_PREFIX_RE = /^(?:მუხლი\s+\d+[¹²³\d.\-–]*\s*\.?\s*)+/;

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
    const push = (t: string) =>
      chunks.push({ url: src.url, lawTitle: src.title, article: src.title, label: src.title, text: t.trim() });
    for (const p of paras) {
      if ((buf + "\n\n" + p).length > MAX_CHUNK_CHARS && buf) {
        push(buf);
        buf = p;
      } else {
        buf = buf ? `${buf}\n\n${p}` : p;
      }
    }
    if (buf.trim()) push(buf);
    return chunks;
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : text.length;
    let body = text.slice(start, end).trim();
    if (body.length > MAX_CHUNK_CHARS) body = body.slice(0, MAX_CHUNK_CHARS);
    if (!body) continue;
    const article = markers[i].label.replace(/\.$/, "");
    const articleTitle = extractArticleTitle(body);
    chunks.push({
      url: src.url,
      lawTitle: src.title,
      chapter: chapterAt(start),
      article,
      articleTitle,
      label: articleTitle ? `${article}. ${articleTitle}` : article,
      text: body,
    });
  }
  return chunks;
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

function scoreChunk(chunkText: string, stems: string[]): number {
  const hay = chunkText.toLowerCase();
  const title = hay.slice(0, TITLE_ZONE_CHARS);
  let score = 0;
  let distinct = 0;
  for (const s of stems) {
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
    score += count;
    if (title.includes(s)) score += TITLE_WEIGHT;
  }
  // Reward chunks that hit several distinct keywords, not one repeated word.
  return score + distinct * 2;
}

/**
 * Search across all fetched sources, return the top matching chunks.
 * Returns [] when nothing meaningfully matches (hard rule #7: don't guess).
 */
export function searchSources(
  sources: FetchedSource[],
  query: string,
  topK = 4
): ScoredChunk[] {
  const stems = tokenize(query);
  if (stems.length === 0) return [];

  const scored: ScoredChunk[] = [];
  for (const src of sources) {
    for (const chunk of chunkDocument(src)) {
      const score = scoreChunk(chunk.text, stems);
      if (score > 0) scored.push({ ...chunk, score });
    }
  }

  // Stable sort (score desc); ties keep document order, so general/foundational
  // articles (which appear earlier in a legal code) rank ahead of later ones.
  scored.sort((a, b) => b.score - a.score);
  // Require a title-relevance hit or a genuine multi-keyword match, not a single
  // incidental mention — keeps the not-found path honest (hard rule #7).
  return scored.filter((c) => c.score >= 4).slice(0, topK);
}
