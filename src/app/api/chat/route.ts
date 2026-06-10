import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Consultation } from "@/lib/models/consultation";
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.consultationsRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Consultation quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

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

  const searchQuery: SearchQuery = {
    original: expanded.original,
    keywords: expanded.keywords,
    hypothetical: expanded.hypothetical,
  };
  const matches = searchSources(fetched, searchQuery, 6);
  if (matches.length === 0) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

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

  const { prose, citations } = parseAnswer(full);
  const answer = prose || NOT_FOUND_MSG;

  if (answer.trim() === NOT_FOUND_MSG) {
    return NextResponse.json(
      { answer: NOT_FOUND_MSG, legalBasis: [] },
      { status: 200 }
    );
  }

  const legalBasis = buildLegalBasis(matches, citations);

  // Save consultation and decrement quota after a successful AI answer.
  const sources = legalBasis.flatMap((g) =>
    g.items.map((i) => ({
      title: g.lawName,
      code: g.lawName,
      articleNumber:
        i.article +
        (i.paragraph ? ` პ.${i.paragraph}` : "") +
        (i.subparagraph ? ` ქ.${i.subparagraph}` : ""),
      url: g.url,
    }))
  );

  const saveOps: Promise<unknown>[] = [
    Consultation.create({ userId: session.user.id, question, answer, sources }),
  ];
  if (!isAdmin) {
    saveOps.push(User.findByIdAndUpdate(session.user.id, { $inc: { consultationsRemaining: -1 } }));
  }
  await Promise.all(saveOps);

  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Legal-Basis": encodeURIComponent(JSON.stringify(legalBasis)),
    },
  });
}
