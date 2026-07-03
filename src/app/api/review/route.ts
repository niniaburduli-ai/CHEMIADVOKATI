import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { callOpenRouterChat } from "@/lib/ai-call";
import {
  ANALYSIS_SYSTEM_PROMPT,
  MAX_ANALYSIS_TEXT,
  MAX_FILE_BYTES,
  extensionOf,
  isSupportedExtension,
  extractDocumentText,
  parseAnalysisResponse,
} from "@/lib/legal/document-analysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docReviewRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Document review quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const ct = req.headers.get("content-type") ?? "";
  let text = "";
  let fileName = "document";

  if (ct.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pastedText = formData.get("text") as string | null;
    if (file && file.size > 0) {
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
        text = await extractDocumentText(fileName, buf);
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
      text = pastedText;
    }
  } else {
    try {
      const body = (await req.json()) as { text?: string; fileName?: string };
      text = String(body.text ?? "");
      fileName = String(body.fileName ?? "document");
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
  }

  text = text.replace(/\s+/g, " ").trim().slice(0, MAX_ANALYSIS_TEXT);
  if (!text) {
    return NextResponse.json({ error: "No document text provided" }, { status: 400 });
  }

  let raw: string;
  try {
    raw = await callOpenRouterChat([
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: `გაანალიზე ეს დოკუმენტი:\n\n${text}` },
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

  const reviewCreate = DocumentReview.create({
    userId: session.user.id,
    fileName,
    summary: analysis.summary,
    findings: analysis.findings,
    recommendations: analysis.recommendations,
  });
  const saveOps: Promise<unknown>[] = [reviewCreate];
  if (!isAdmin) {
    saveOps.push(User.findByIdAndUpdate(session.user.id, { $inc: { docReviewRemaining: -1 } }));
  }
  const [review] = await Promise.all(saveOps);

  return NextResponse.json(
    {
      id: String((review as { _id: unknown })._id),
      fileName,
      summary: analysis.summary,
      findings: analysis.findings,
      recommendations: analysis.recommendations,
    },
    { status: 201 }
  );
}
