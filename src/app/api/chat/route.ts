import { NextResponse } from "next/server";
import { ConsultationCreateSchema } from "@/lib/validators";
import { APPROVED_SOURCES } from "@/lib/legal/sources";
import { fetchApprovedSource } from "@/lib/legal/fetch-source";
import { searchSources } from "@/lib/legal/search";
import {
  SYSTEM_PROMPT,
  buildGroundedPrompt,
  streamLegalAnswer,
} from "@/lib/legal/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND_MSG = "პასუხი ვერ მოიძებნა დამტკიცებულ იურიდიულ წყაროებში.";

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

  // Hard rule #3: fetch/read only the approved sources before answering.
  const fetched = (
    await Promise.all(
      APPROVED_SOURCES.map((s) => fetchApprovedSource(s.url, s.title))
    )
  ).filter((s): s is NonNullable<typeof s> => s !== null);

  if (fetched.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, sources: [] },
      { status: 200 }
    );
  }

  // Hard rule #4: find relevant text. #7: if nothing matches, don't guess.
  const matches = searchSources(fetched, question, 3);
  if (matches.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, sources: [] },
      { status: 200 }
    );
  }

  // One citation per matched article (hard rule #6: include source + where).
  const sourceMeta = matches.map((m) => ({
    url: m.url,
    lawTitle: m.lawTitle,
    chapter: m.chapter ?? null,
    article: m.article,
    articleTitle: m.articleTitle ?? null,
    label: m.label,
  }));

  // Hard rule #4/#5/#8: pass ONLY matched source text to the model to summarize.
  const userPrompt = buildGroundedPrompt(question, matches);

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await streamLegalAnswer([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "AI service unavailable", detail: String(err instanceof Error ? err.message : err) },
      { status: 502 }
    );
  }

  // Stream plain text answer; matched sources travel in a header so the client
  // can show citations (hard rule #6: include the source link used).
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Legal-Sources": encodeURIComponent(JSON.stringify(sourceMeta)),
    },
  });
}
