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
import { isCircuitOpen, recordFetchFailure, recordFetchSuccess } from "@/lib/legal/fetch-circuit";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { splitQuota, applyQuotaSplit, type QuotaSplit } from "@/lib/quota";
import { getCachedAnswer, setCachedAnswer } from "@/lib/legal/answer-cache";
import {
  buildLegalBasis,
  hasVerifiedCitation,
  type LegalBasisGroup,
} from "@/lib/legal/citations";
import {
  SYSTEM_PROMPT,
  FEWSHOT,
  NOT_FOUND_MSG,
  TECHNICAL_ERROR_MSG,
  buildGroundedPrompt,
  generateLegalAnswer,
  parseAnswer,
  searchWebContext,
  answerViaWebSearch,
  streamText,
  type WebSource,
} from "@/lib/legal/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Save the consultation, decrement quota, and stream the answer to the client. */
async function finalizeAnswer(params: {
  userId: string;
  isAdmin: boolean;
  quotaSplit: QuotaSplit | null;
  question: string;
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
}): Promise<Response> {
  const { userId, isAdmin, quotaSplit, question, answer, legalBasis, webSources } = params;

  // Grounded-source citations when we have them; otherwise fall back to the
  // web-search sources so a web-fallback answer still records where it came
  // from (title/url only — no article, since it's not a matsne citation).
  const sources =
    legalBasis.length > 0
      ? legalBasis.flatMap((g) =>
          g.items.map((i) => ({
            title: g.lawName,
            code: g.lawName,
            url: g.url,
            article: i.article,
            paragraph: i.paragraph ?? undefined,
            subparagraph: i.subparagraph ?? undefined,
          }))
        )
      : (webSources ?? []).map((s) => ({ title: s.title, url: s.url }));

  const saveOps: Promise<unknown>[] = [
    Consultation.create({ userId, question, answer, sources }),
  ];
  if (!isAdmin && quotaSplit) {
    saveOps.push(applyQuotaSplit(userId, "consultations", quotaSplit));
  }
  await Promise.all(saveOps);

  return new Response(streamText(answer), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Legal-Basis": encodeURIComponent(JSON.stringify(legalBasis)),
      ...(webSources && webSources.length > 0
        ? { "X-Web-Sources": encodeURIComponent(JSON.stringify(webSources)) }
        : {}),
    },
  });
}

/**
 * Last resort when the 8 approved sources don't cover the question: search
 * the web for the real answer across all of Georgian legislation instead of
 * refusing. Only reaches here on a genuine miss, so it doesn't add cost to
 * the common case. Falls back to the literal NOT_FOUND_MSG if the web
 * search itself comes up empty too.
 */
async function tryWebFallback(
  userId: string,
  isAdmin: boolean,
  quotaSplit: QuotaSplit | null,
  question: string,
  keywords?: string[]
): Promise<Response> {
  const web = await answerViaWebSearch(question, keywords);
  const prose = web?.prose.trim();
  if (web && prose && prose !== NOT_FOUND_MSG) {
    await setCachedAnswer(question, { answer: prose, legalBasis: [], webSources: web.sources });
    return finalizeAnswer({
      userId,
      isAdmin,
      quotaSplit,
      question,
      answer: prose,
      legalBasis: [],
      webSources: web.sources,
    });
  }
  return NextResponse.json(
    { answer: NOT_FOUND_MSG, legalBasis: [] },
    { status: 200 }
  );
}

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
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  user = await applyCustomPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";
  const quotaSplit = isAdmin ? null : splitQuota(user, "consultations", 1);
  if (!isAdmin && !quotaSplit) {
    return NextResponse.json(
      { error: "Consultation quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const cached = await getCachedAnswer(question);
  if (cached) {
    return finalizeAnswer({
      userId: session.user.id,
      isAdmin,
      quotaSplit,
      question,
      answer: cached.answer,
      legalBasis: cached.legalBasis,
      webSources: cached.webSources,
    });
  }

  const expanded = await expandQuery(question);
  const selected =
    expanded.sourceIds.length > 0
      ? APPROVED_SOURCES.filter((s) => expanded.sourceIds.includes(s.id))
      : APPROVED_SOURCES;

  let fetched: NonNullable<Awaited<ReturnType<typeof fetchApprovedSource>>>[] = [];
  if (!isCircuitOpen()) {
    const fetchedRaw = await Promise.all(
      selected.map((s) => fetchApprovedSource(s.url, s.title))
    );
    fetched = fetchedRaw.filter((s): s is NonNullable<typeof s> => s !== null);
    if (fetched.length > 0) {
      recordFetchSuccess();
    } else {
      recordFetchFailure();
    }
  }

  if (fetched.length === 0) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.keywords);
  }

  const searchQuery: SearchQuery = {
    original: expanded.original,
    keywords: expanded.keywords,
    hypothetical: expanded.hypothetical,
  };
  const matches = searchSources(fetched, searchQuery, 10);
  if (matches.length === 0) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.keywords);
  }

  // Only pay Perplexity's per-request search fee once we know it'll actually
  // be used — firing this earlier in parallel with fetch/expand billed the
  // fee on every miss that fell through to tryWebFallback above, which never
  // reads this result. Also skip it outright when the classifier (expandQuery)
  // decided this question is a pure fact/definition lookup that the law text
  // already answers fully — practical/real-world context is explicitly
  // secondary color (SYSTEM_PROMPT rule 10), not needed on every request.
  const web = expanded.needsWebContext ? await searchWebContext(question) : null;
  const userPrompt = buildGroundedPrompt(
    question,
    matches.map((m) => ({ ...m, lawTitle: cleanLawName(m.lawTitle) })),
    web?.summary
  );

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...FEWSHOT,
    { role: "user" as const, content: userPrompt },
  ];

  // Try the cheap model first for every question, regardless of topic. Only
  // escalate to the expensive backup model when the cheap answer fails to
  // ground itself in a verified matsne.gov.ge citation (or errors outright) —
  // this is a retry, not an upfront complexity guess, so simple questions
  // (criminal law included) never pay for the expensive model.
  let prose = "";
  let citations: ReturnType<typeof parseAnswer>["citations"] = [];
  try {
    const full = await generateLegalAnswer(messages, false);
    ({ prose, citations } = parseAnswer(full));
  } catch {
    // fall through to escalation below
  }

  const cheapIsGrounded =
    prose.trim() !== "" &&
    prose.trim() !== NOT_FOUND_MSG &&
    hasVerifiedCitation(matches, citations);

  if (!cheapIsGrounded) {
    try {
      const full = await generateLegalAnswer(messages, true);
      ({ prose, citations } = parseAnswer(full));
    } catch {
      if (!prose) {
        // Both the cheap and expensive draft calls threw — OpenRouter itself
        // is unreachable/misconfigured, not a "law doesn't cover this" case.
        // Distinct from NOT_FOUND_MSG so the user sees a retry prompt, not a
        // scary "not found in approved sources".
        return NextResponse.json(
          { answer: TECHNICAL_ERROR_MSG, legalBasis: [] },
          { status: 200 }
        );
      }
      // Expensive retry failed but the cheap model at least produced
      // something — keep it rather than failing the request outright.
    }
  }

  const answer = prose || NOT_FOUND_MSG;

  // The 8 approved sources didn't have it, per the grounded model itself —
  // last resort before refusing: search the web across all Georgian law.
  if (answer.trim() === NOT_FOUND_MSG) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.keywords);
  }

  const legalBasis = buildLegalBasis(matches, citations);

  await setCachedAnswer(question, { answer, legalBasis, webSources: web?.sources });

  return finalizeAnswer({
    userId: session.user.id,
    isAdmin,
    quotaSplit,
    question,
    answer,
    legalBasis,
    webSources: web?.sources,
  });
}
