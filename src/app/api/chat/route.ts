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
  CITATION_DELIM,
  ANSWER_TIER_ORDER,
  buildGroundedPrompt,
  parseAnswer,
  searchWebContext,
  answerViaWebSearch,
  streamLegalAnswer,
  streamText,
  type AnswerTier,
  type ChatMessage,
  type WebContext,
  type WebSource,
} from "@/lib/legal/openrouter";
import { DelimiterSplitter } from "@/lib/streaming/delimiter-splitter";
import { encodeReset, encodeMeta } from "@/lib/streaming/chat-protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

/** Which model tier actually produced an answer — recorded per consultation
 * so the admin panel can show free-vs-paid usage without reading server logs. */
type ModelTier = AnswerTier | "web" | "cached";

/** Save the consultation, decrement quota, and stream the answer to the client. */
async function finalizeAnswer(params: {
  userId: string;
  isAdmin: boolean;
  quotaSplit: QuotaSplit | null;
  question: string;
  answer: string;
  legalBasis: LegalBasisGroup[];
  webSources?: WebSource[];
  modelTier: ModelTier;
  costUsd: number;
}): Promise<Response> {
  const { userId, isAdmin, quotaSplit, question, answer, legalBasis, webSources, modelTier, costUsd } =
    params;

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
    Consultation.create({ userId, question, answer, sources, modelTier, costUsd }),
  ];
  if (!isAdmin && quotaSplit) {
    saveOps.push(applyQuotaSplit(userId, "consultations", quotaSplit));
  }
  await Promise.all(saveOps);

  // Trailing in-band metadata instead of response headers: with true
  // upstream streaming (below) legal-basis citations aren't known until
  // generation finishes, i.e. after the body has already started —
  // headers can't be set that late, so both this (instant, cached/fallback)
  // path and the live-generation path share one body-encoded protocol.
  const meta = encodeMeta({ legalBasis, webSources: webSources ?? [] });
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = streamText(answer).getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.enqueue(encoder.encode(meta));
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
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
  priorCostUsd: number,
  keywords?: string[]
): Promise<Response> {
  const web = await answerViaWebSearch(question, keywords);
  const costUsd = priorCostUsd + web.costUsd;
  const prose = web.answer?.prose.trim();
  if (web.answer && prose && prose !== NOT_FOUND_MSG) {
    await setCachedAnswer(question, { answer: prose, legalBasis: [], webSources: web.answer.sources });
    return finalizeAnswer({
      userId,
      isAdmin,
      quotaSplit,
      question,
      answer: prose,
      legalBasis: [],
      webSources: web.answer.sources,
      modelTier: "web",
      costUsd,
    });
  }
  return NextResponse.json(
    { answer: NOT_FOUND_MSG, legalBasis: [] },
    { status: 200 }
  );
}

/** One live-streamed model attempt: opens the upstream connection (throws if
 * it can't), yields only the safe prose prefix (before CITATION_DELIM) as it
 * arrives, and returns the full raw text (prose + citation block) once the
 * upstream stream ends — same shape `parseAnswer` expects. */
async function* streamAnswerAttempt(
  messages: ChatMessage[],
  tier: AnswerTier
): AsyncGenerator<string, { full: string; costUsd: number }, unknown> {
  const deltas = await streamLegalAnswer(messages, tier);
  const splitter = new DelimiterSplitter(CITATION_DELIM);
  let full = "";
  let r = await deltas.next();
  while (!r.done) {
    full += r.value;
    const safe = splitter.push(r.value);
    if (safe) yield safe;
    r = await deltas.next();
  }
  const costUsd = r.value ?? 0;
  const { prose } = splitter.finish();
  if (prose) yield prose;
  return { full, costUsd };
}

type ChatStreamEvent = { type: "chunk"; text: string } | { type: "reset" };
type ChatOutcome =
  | {
      kind: "answer";
      text: string;
      legalBasis: LegalBasisGroup[];
      webSources?: WebSource[];
      modelTier: ModelTier;
      costUsd: number;
    }
  | { kind: "not_found" }
  | { kind: "technical_error" };

/**
 * Drains one attempt to completion, forwarding chunks via `yield`. On a
 * mid-stream failure, emits a reset (if anything was shown) and returns ""
 * — matching the non-streaming original, where a thrown call leaves `prose`
 * empty rather than partially filled.
 */
async function* drainAttempt(
  messages: ChatMessage[],
  tier: AnswerTier,
  shownAny: { value: boolean }
): AsyncGenerator<ChatStreamEvent, { full: string; costUsd: number }, unknown> {
  // Creating the generator runs no code yet (generator bodies don't execute
  // until the first `.next()`) — so both a connect failure and a mid-stream
  // failure surface at the same place, inside this loop, and get identical
  // treatment: any thrown error means "this attempt produced nothing" — the
  // free tiers throw for this reason often (rate limits, a retired :free
  // model slug), and that's expected: it just means "move to the next tier",
  // matching the non-streaming original where a thrown call leaves `prose`
  // empty rather than partially filled.
  const it = streamAnswerAttempt(messages, tier);
  try {
    let r = await it.next();
    while (!r.done) {
      yield { type: "chunk", text: r.value };
      shownAny.value = true;
      r = await it.next();
    }
    return r.value;
  } catch {
    if (shownAny.value) yield { type: "reset" };
    shownAny.value = false;
    return { full: "", costUsd: 0 };
  }
}

/**
 * Full grounded-answer flow, streamed: walk ANSWER_TIER_ORDER (free -> free ->
 * cheap -> complex) live, visibly restarting the display between tiers, and
 * stop at the first rung whose draft grounds itself in a verified citation.
 * The last rung's output is accepted even if still unverified — matching the
 * original cheap->complex behavior, just generalized to more rungs. If a
 * later tier produces nothing at all (throttled free model, dead :free slug,
 * a genuine connection failure), fall back to the most recent non-empty
 * earlier draft rather than losing everything. Falls through to the
 * web-search last resort if the final answer is still the literal
 * NOT_FOUND_MSG.
 */
async function* runChatStream(
  messages: ChatMessage[],
  matches: ReturnType<typeof searchSources>,
  question: string,
  keywords: string[] | undefined,
  webContext: WebContext | null
): AsyncGenerator<ChatStreamEvent, ChatOutcome, unknown> {
  const shownAny = { value: false };
  let prose = "";
  let citations: ReturnType<typeof parseAnswer>["citations"] = [];
  let lastGoodProse = "";
  let lastGoodCitations: ReturnType<typeof parseAnswer>["citations"] = [];
  let lastGoodTier: AnswerTier | null = null;
  // Which tier's output actually got served — logged below so free-tier
  // outages (a retired :free model slug, sustained rate-limiting) show up in
  // the server logs as "servedTier keeps being cheap/complex" instead of
  // silently going unnoticed.
  let servedTier: AnswerTier | null = null;
  // Real billed cost (USD) accumulated across every tier attempt tried in
  // this loop, even discarded ones — the point is to record what was
  // actually spent, not just the cost of the attempt that got shown.
  let tierCostUsd = 0;

  for (let i = 0; i < ANSWER_TIER_ORDER.length; i++) {
    if (i > 0) {
      if (shownAny.value) yield { type: "reset" };
      shownAny.value = false;
    }

    const tier = ANSWER_TIER_ORDER[i];
    const { full, costUsd: attemptCost } = yield* drainAttempt(messages, tier, shownAny);
    tierCostUsd += attemptCost;
    ({ prose, citations } = parseAnswer(full));

    const grounded =
      prose.trim() !== "" &&
      prose.trim() !== NOT_FOUND_MSG &&
      hasVerifiedCitation(matches, citations);
    const isLastTier = i === ANSWER_TIER_ORDER.length - 1;

    if (grounded || isLastTier) {
      servedTier = tier;
      break;
    }

    if (prose.trim() !== "") {
      lastGoodProse = prose;
      lastGoodCitations = citations;
      lastGoodTier = tier;
    }
  }

  // The final tier produced nothing (threw, or genuinely empty) but an
  // earlier rung had a draft — restore it instead of ending up empty-handed.
  if (prose.trim() === "" && lastGoodProse) {
    if (shownAny.value) yield { type: "reset" };
    yield { type: "chunk", text: lastGoodProse };
    shownAny.value = true;
    prose = lastGoodProse;
    citations = lastGoodCitations;
    servedTier = lastGoodTier;
  }

  console.log(
    `[chat] answer tier served: ${servedTier ?? "none (all tiers failed)"}`
  );

  if (!prose && !shownAny.value) {
    return { kind: "technical_error" };
  }

  const answer = prose || NOT_FOUND_MSG;
  if (answer.trim() === NOT_FOUND_MSG) {
    if (shownAny.value) yield { type: "reset" };
    const web = await answerViaWebSearch(question, keywords);
    tierCostUsd += web.costUsd;
    const webProse = web.answer?.prose.trim();
    if (web.answer && webProse && webProse !== NOT_FOUND_MSG) {
      yield { type: "chunk", text: webProse };
      return {
        kind: "answer",
        text: webProse,
        legalBasis: [],
        webSources: web.answer.sources,
        modelTier: "web",
        costUsd: tierCostUsd,
      };
    }
    return { kind: "not_found" };
  }

  const legalBasis = buildLegalBasis(matches, citations);
  return {
    kind: "answer",
    text: answer,
    legalBasis,
    webSources: webContext?.sources,
    modelTier: servedTier ?? "cheap",
    costUsd: tierCostUsd,
  };
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

  const { value: cached, embedding: questionEmbedding } = await getCachedAnswer(question);
  if (cached) {
    return finalizeAnswer({
      userId: session.user.id,
      isAdmin,
      quotaSplit,
      question,
      answer: cached.answer,
      legalBasis: cached.legalBasis,
      webSources: cached.webSources,
      modelTier: "cached",
      costUsd: 0,
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
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.costUsd, expanded.keywords);
  }

  const searchQuery: SearchQuery = {
    original: expanded.original,
    keywords: expanded.keywords,
    hypothetical: expanded.hypothetical,
  };
  const matches = searchSources(fetched, searchQuery, 10);
  if (matches.length === 0) {
    return tryWebFallback(session.user.id, isAdmin, quotaSplit, question, expanded.costUsd, expanded.keywords);
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

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...FEWSHOT,
    { role: "user", content: userPrompt },
  ];

  const bodyStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let outcome: ChatOutcome;
      try {
        const gen = runChatStream(messages, matches, question, expanded.keywords, web);
        let r = await gen.next();
        while (!r.done) {
          const ev = r.value;
          controller.enqueue(
            encoder.encode(ev.type === "chunk" ? ev.text : encodeReset())
          );
          r = await gen.next();
        }
        outcome = r.value;
      } catch {
        outcome = { kind: "technical_error" };
      }

      if (outcome.kind === "technical_error") {
        controller.enqueue(encoder.encode(TECHNICAL_ERROR_MSG));
        controller.enqueue(encoder.encode(encodeMeta({ legalBasis: [] })));
        controller.close();
        return;
      }
      if (outcome.kind === "not_found") {
        controller.enqueue(encoder.encode(NOT_FOUND_MSG));
        controller.enqueue(encoder.encode(encodeMeta({ legalBasis: [] })));
        controller.close();
        return;
      }

      await setCachedAnswer(
        question,
        { answer: outcome.text, legalBasis: outcome.legalBasis, webSources: outcome.webSources },
        questionEmbedding
      );

      const sources =
        outcome.legalBasis.length > 0
          ? outcome.legalBasis.flatMap((g) =>
              g.items.map((i) => ({
                title: g.lawName,
                code: g.lawName,
                url: g.url,
                article: i.article,
                paragraph: i.paragraph ?? undefined,
                subparagraph: i.subparagraph ?? undefined,
              }))
            )
          : (outcome.webSources ?? []).map((s) => ({ title: s.title, url: s.url }));

      const saveOps: Promise<unknown>[] = [
        Consultation.create({
          userId: session.user.id,
          question,
          answer: outcome.text,
          sources,
          modelTier: outcome.modelTier,
          costUsd: expanded.costUsd + (web?.costUsd ?? 0) + outcome.costUsd,
        }),
      ];
      if (!isAdmin && quotaSplit) {
        saveOps.push(applyQuotaSplit(session.user.id, "consultations", quotaSplit));
      }
      await Promise.all(saveOps);

      controller.enqueue(
        encoder.encode(
          encodeMeta({ legalBasis: outcome.legalBasis, webSources: outcome.webSources ?? [] })
        )
      );
      controller.close();
    },
  });

  return new Response(bodyStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
