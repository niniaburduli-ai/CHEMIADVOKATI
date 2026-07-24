import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { callOpenRouterChat } from "@/lib/ai-call";
import { DocumentImproveSchema } from "@/lib/validators";
import type { RiskFinding } from "@/lib/legal/document-analysis";
import {
  IMPROVEMENT_SYSTEM_PROMPT,
  buildImprovementUserMessage,
  parseImprovementResponse,
  reviewCreditCost,
} from "@/lib/legal/document-analysis";
import { splitQuota, applyQuotaSplit, totalRemaining } from "@/lib/quota";
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
  const { reviewId, instruction } = parsed.data;

  if (!isValidObjectId(reviewId)) {
    return NextResponse.json({ error: "Invalid reviewId" }, { status: 400 });
  }

  await dbConnect();
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  user = await applyCustomPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";

  const review = await DocumentReview.findById(reviewId);
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (String(review.userId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if ((review.revisions ?? []).length > 0) {
    return NextResponse.json(
      { error: "This document has already been improved. Start a new analysis for further changes." },
      { status: 409 }
    );
  }

  // Same size-based pricing as the initial review (reviewCreditCost) — an
  // improve call re-sends the full document and asks for a full rewrite, so
  // it costs the same as reviewing that document again, not a flat 1 credit.
  const creditsRequired = reviewCreditCost(review.pages);
  const quotaSplit = isAdmin ? null : splitQuota(user, "docReview", creditsRequired);
  if (!isAdmin && !quotaSplit) {
    return NextResponse.json(
      {
        error: `This document (${review.pages} pages) requires ${creditsRequired} review credits; you have ${totalRemaining(user, "docReview")} remaining.`,
      },
      { status: 403 }
    );
  }

  const baseText = review.sourceText || "";
  if (!baseText) {
    return NextResponse.json(
      { error: "No source text available for this review" },
      { status: 400 }
    );
  }
  const currentFindings = (review.findings ?? []) as RiskFinding[];

  const userMessage = buildImprovementUserMessage({
    baseText,
    findings: currentFindings,
    instruction,
  });

  let raw: string;
  let costUsd = 0;
  try {
    const result = await callOpenRouterChat(
      [
        { role: "system", content: IMPROVEMENT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      undefined,
      16000
    );
    raw = result.content;
    costUsd = result.costUsd;
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
    instruction,
    createdAt: new Date(),
  };
  const diff = computeWordDiff(baseText, improvement.text);
  review.revisions.push(revision);
  review.costUsd = (review.costUsd ?? 0) + costUsd;
  await review.save();

  if (!isAdmin && quotaSplit) {
    await applyQuotaSplit(session.user.id, "docReview", quotaSplit);
  }

  return NextResponse.json({ id: String(review._id), revision, diff }, { status: 201 });
}
