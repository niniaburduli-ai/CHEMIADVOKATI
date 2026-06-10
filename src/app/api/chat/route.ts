import { NextResponse } from "next/server";
import { ConsultationCreateSchema } from "@/lib/validators";
import { APPROVED_SOURCES, cleanLawName } from "@/lib/legal/sources";
import { fetchApprovedSource } from "@/lib/legal/fetch-source";
import { searchSources, type SearchQuery } from "@/lib/legal/search";
import { expandQuery } from "@/lib/legal/query-understanding";
import { buildLegalBasis } from "@/lib/legal/citations";
import {
  SYSTEM_PROMPT,
  FEWSHOT,
  NOT_FOUND_MSG,
  buildGroundedPrompt,
  generateLegalAnswer,
  parseAnswer,
  streamText,
} from "@/lib/legal/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConsultationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const question = parsed.data.question;

  // Understand + classify the question first, then fetch ONLY the law(s) it is
  // about (hard rule #3: read only approved sources). If the classifier can't
  // decide (empty), fall back to all sources so we never wrongly refuse.
  const expanded = await expandQuery(question);
  const selected =
    expanded.sourceIds.length > 0
      ? APPROVED_SOURCES.filter((s) => expanded.sourceIds.includes(s.id))
      : APPROVED_SOURCES;

  const fetchedRaw = await Promise.all(
    selected.map((s) => fetchApprovedSource(s.url, s.title))
  );
  const fetched = fetchedRaw.filter(
    (s): s is NonNullable<typeof s> => s !== null
  );

  if (fetched.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  // Hard rule #4: find relevant text via the weighted multi-query (original +
  // legal keywords + HyDE). #7: if nothing matches, don't guess.
  const searchQuery: SearchQuery = {
    original: expanded.original,
    keywords: expanded.keywords,
    hypothetical: expanded.hypothetical,
  };
  const matches = searchSources(fetched, searchQuery, 4);
  if (matches.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  // Pass ONLY matched source text (clean law names) to the model to summarize.
  const userPrompt = buildGroundedPrompt(
    question,
    matches.map((m) => ({ ...m, lawTitle: cleanLawName(m.lawTitle) }))
  );

  let full: string;
  try {
    full = await generateLegalAnswer([
      { role: "system", content: SYSTEM_PROMPT },
      ...FEWSHOT,
      { role: "user", content: userPrompt },
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  // Split prose from the model's structured citation block.
  const { prose, citations } = parseAnswer(full);
  const answer = prose || NOT_FOUND_MSG;

  // No grounded answer → no citations (hard rule #7).
  if (answer.trim() === NOT_FOUND_MSG) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  // Build the grounded Legal Basis (validated against the provided articles).
  const legalBasis = buildLegalBasis(matches, citations);

  // Stream the prose; the Legal Basis travels in a header (hard rule #6).
  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Legal-Basis": encodeURIComponent(JSON.stringify(legalBasis)),
    },
  });
}
