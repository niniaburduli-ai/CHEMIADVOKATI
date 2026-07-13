import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { applyPlanExpiryIfDue } from "@/lib/plan-expiry";
import { callOpenRouterChat } from "@/lib/ai-call";
import { DocumentImproveSchema } from "@/lib/validators";
import type { RiskFinding } from "@/lib/legal/document-analysis";
import {
  IMPROVEMENT_SYSTEM_PROMPT,
  buildImprovementUserMessage,
  parseImprovementResponse,
} from "@/lib/legal/document-analysis";
import { computeWordDiff } from "@/lib/diff-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = DocumentImproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { reviewId, instruction, answers } = parsed.data;

  if (!isValidObjectId(reviewId)) {
    return NextResponse.json({ error: "Invalid reviewId" }, { status: 400 });
  }

  await dbConnect();
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docReviewRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Document review quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const review = await DocumentReview.findById(reviewId);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (String(review.userId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const revisions = (review.revisions ?? []) as Array<{
    text: string;
    findings: RiskFinding[];
    questions: string[];
  }>;
  const latest = revisions[revisions.length - 1];
  const baseText = latest?.text || review.sourceText || "";
  if (!baseText) {
    return NextResponse.json(
      { error: "No source text available for this review" },
      { status: 400 }
    );
  }
  const currentFindings = (latest?.findings ?? review.findings ?? []) as RiskFinding[];
  const priorQuestions = latest?.questions ?? [];

  const userMessage = buildImprovementUserMessage({
    baseText,
    findings: currentFindings,
    priorQuestions,
    instruction,
    answers,
  });

  let raw: string;
  try {
    raw = await callOpenRouterChat(
      [
        { role: "system", content: IMPROVEMENT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      undefined,
      16000
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI service unavailable",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  let improvement;
  try {
    improvement = parseImprovementResponse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI returned an unreadable response",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const revision = {
    text: improvement.text,
    summary: improvement.summary,
    findings: improvement.findings,
    recommendations: improvement.recommendations,
    questions: improvement.questions,
    instruction,
    answers,
    createdAt: new Date(),
  };
  const diff = computeWordDiff(baseText, improvement.text);
  review.revisions.push(revision);
  await review.save();

  if (!isAdmin) {
    await User.findByIdAndUpdate(session.user.id, { $inc: { docReviewRemaining: -1 } });
  }

  return NextResponse.json({ id: String(review._id), revision, diff }, { status: 201 });
}
