import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { applyPlanExpiryIfDue, applyCustomPlanExpiryIfDue } from "@/lib/plan-expiry";
import { splitQuota, applyQuotaSplit, totalRemaining } from "@/lib/quota";
import { callOpenRouterChat } from "@/lib/ai-call";
import { ReviewDocTextSchema } from "@/lib/validators";
import {
  ANALYSIS_SYSTEM_PROMPT,
  MAX_ANALYSIS_TEXT,
  MAX_FILE_BYTES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  MAX_REVIEW_PAGES,
  extensionOf,
  isSupportedExtension,
  isImageExtension,
  extractDocumentText,
  extractTextFromImages,
  estimatePages,
  reviewCreditCost,
  parseAnalysisResponse,
} from "@/lib/legal/document-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  user = await applyCustomPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";
  if (!isAdmin && totalRemaining(user, "docReview") <= 0) {
    return NextResponse.json(
      { error: "Document review quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  let text = "";
  let fileName = "document";
  let skippedImages = 0;
  let pages = 1;

  if (ct.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const images = formData.getAll("images") as File[];
    const pastedText = formData.get("text") as string | null;

    if (images.length > 0) {
      if (images.length > MAX_IMAGES) {
        return NextResponse.json(
          { error: `Select at most ${MAX_IMAGES} images.` },
          { status: 400 }
        );
      }
      for (const image of images) {
        const ext = extensionOf(image.name);
        if (!isImageExtension(ext)) {
          return NextResponse.json(
            { error: "Unsupported image type. Use JPG." },
            { status: 400 }
          );
        }
        if (image.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: "One or more images are too large (max 8MB each)." },
            { status: 400 }
          );
        }
      }
      let ocr: { combinedText: string; succeededCount: number; failedCount: number };
      try {
        ocr = await extractTextFromImages(
          await Promise.all(
            images.map(async (image) => ({
              name: image.name,
              buffer: Buffer.from(await image.arrayBuffer()),
            }))
          )
        );
      } catch (err) {
        return NextResponse.json(
          {
            error: "Could not read any of the uploaded images",
            detail: String(err instanceof Error ? err.message : err),
          },
          { status: 400 }
        );
      }
      fileName = `${ocr.succeededCount} ფოტოს დოკუმენტი`;
      text = ocr.combinedText;
      skippedImages = ocr.failedCount;
      // Each uploaded image is already one physical page of the source
      // document — no heuristic needed, unlike DOCX/TXT/pasted text below.
      pages = ocr.succeededCount;
    } else if (file && file.size > 0) {
      fileName = file.name;
      const ext = extensionOf(fileName);
      if (!isSupportedExtension(ext)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use PDF, DOCX, TXT, or MD." },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "File too large (max 10MB)." }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      try {
        const extracted = await extractDocumentText(fileName, buf);
        text = extracted.text;
        pages = extracted.pages;
      } catch (err) {
        return NextResponse.json(
          {
            error: "Could not read document contents",
            detail: String(err instanceof Error ? err.message : err),
          },
          { status: 400 }
        );
      }
    } else if (pastedText) {
      const parsedText = ReviewDocTextSchema.shape.text.safeParse(pastedText);
      if (!parsedText.success) {
        return NextResponse.json(
          { error: "Validation failed", fields: parsedText.error.flatten().formErrors },
          { status: 400 }
        );
      }
      text = parsedText.data;
      pages = estimatePages(text);
    }
  } else {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsedBody = ReviewDocTextSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Validation failed", fields: parsedBody.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    text = parsedBody.data.text;
    fileName = parsedBody.data.fileName ?? "document";
    pages = estimatePages(text);
  }

  text = text.replace(/\s+/g, " ").trim().slice(0, MAX_ANALYSIS_TEXT);
  if (!text) {
    return NextResponse.json({ error: "No document text provided" }, { status: 400 });
  }

  if (pages > MAX_REVIEW_PAGES) {
    return NextResponse.json(
      {
        error: `Document too long (${pages} pages). Maximum ${MAX_REVIEW_PAGES} pages per review — please split it.`,
      },
      { status: 400 }
    );
  }

  // Base quota covers up to BASE_REVIEW_PAGES pages for 1 credit; longer
  // documents are analyzed in full (never truncated) but cost proportionally
  // more credits instead — see reviewCreditCost.
  const creditsRequired = reviewCreditCost(pages);
  const quotaSplit = isAdmin ? null : splitQuota(user, "docReview", creditsRequired);
  if (!isAdmin && !quotaSplit) {
    return NextResponse.json(
      {
        error: `This document (${pages} pages) requires ${creditsRequired} review credits; you have ${totalRemaining(user, "docReview")} remaining.`,
      },
      { status: 403 }
    );
  }

  let raw: string;
  try {
    raw = await callOpenRouterChat(
      [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: `გაანალიზე ეს დოკუმენტი:\n\n${text}` },
      ],
      undefined,
      6000
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

  let analysis;
  try {
    analysis = parseAnalysisResponse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI returned an unreadable response",
        detail: String(err instanceof Error ? err.message : err),
      },
      { status: 502 }
    );
  }

  const creditsUsed = isAdmin ? 0 : creditsRequired;

  const review = await DocumentReview.create({
    userId: session.user.id,
    fileName,
    summary: analysis.summary,
    findings: analysis.findings,
    recommendations: analysis.recommendations,
    sourceText: text,
    pages,
    creditsUsed,
  });
  if (!isAdmin && quotaSplit) {
    await applyQuotaSplit(session.user.id, "docReview", quotaSplit);
  }

  return NextResponse.json(
    {
      id: String((review as { _id: unknown })._id),
      fileName,
      summary: analysis.summary,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
      pagesAnalyzed: pages,
      creditsUsed,
      ...(skippedImages > 0 ? { skippedImages } : {}),
    },
    { status: 201 }
  );
}
