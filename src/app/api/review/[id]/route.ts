import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { DocumentReview } from "@/lib/models/document-review";
import { computeWordDiff } from "@/lib/diff-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();
  const review = await DocumentReview.findById(id).lean();
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }
  if (String(review.userId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const revisions = review.revisions ?? [];
  const revisionsOut = revisions.map((rev, i) => {
    const baseText = i === 0 ? review.sourceText ?? "" : revisions[i - 1].text;
    return {
      text: rev.text,
      summary: rev.summary,
      findings: rev.findings,
      recommendations: rev.recommendations,
      instruction: rev.instruction,
      diff: computeWordDiff(baseText, rev.text),
    };
  });

  return NextResponse.json({
    id: String(review._id),
    fileName: review.fileName ?? "document",
    summary: review.summary,
    findings: review.findings ?? [],
    recommendations: review.recommendations ?? [],
    revisions: revisionsOut,
  });
}
