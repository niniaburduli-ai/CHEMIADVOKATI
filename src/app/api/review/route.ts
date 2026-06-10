import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { DocumentReview } from "@/lib/models/document-review";
import { callOpenRouterChat } from "@/lib/ai-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 10_000;

const SYSTEM = `შენ ხარ ქართული იურიდიული დოკუმენტების ანალიტიკოსი.
გაანალიზე მოწოდებული დოკუმენტი და მიეცი:
1. მოკლე შეჯამება (2-3 წინადადება)
2. ძირითადი იურიდიული პრობლემები ან შეშფოთებები
3. რეკომენდაციები გასაუმჯობესებლად ან სამოქმედოდ

უპასუხე ქართულ ენაზე. გამოიყენე ზუსტად შემდეგი ფორმატი:

SUMMARY: [შეჯამება]
FINDINGS: [პრობლემა 1] | [პრობლემა 2] | [პრობლემა 3]
RECOMMENDATIONS: [რეკ. 1] | [რეკ. 2] | [რეკ. 3]`;

function parseReviewResponse(raw: string): {
  summary: string;
  findings: string[];
  recommendations: string[];
} {
  const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]+?)(?=\nFINDINGS:|$)/);
  const findingsMatch = raw.match(/FINDINGS:\s*([\s\S]+?)(?=\nRECOMMENDATIONS:|$)/);
  const recsMatch = raw.match(/RECOMMENDATIONS:\s*([\s\S]+?)$/);

  const summary = summaryMatch?.[1]?.trim() ?? raw.slice(0, 400);
  const findings = (findingsMatch?.[1] ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const recommendations = (recsMatch?.[1] ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  return { summary, findings, recommendations };
}

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
      const buf = Buffer.from(await file.arrayBuffer());
      // Strip null bytes that appear in binary PDFs; keep readable text
      text = buf.toString("utf-8").replace(/\0/g, " ");
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

  text = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  if (!text) {
    return NextResponse.json({ error: "No document text provided" }, { status: 400 });
  }

  let raw: string;
  try {
    raw = await callOpenRouterChat([
      { role: "system", content: SYSTEM },
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

  const { summary, findings, recommendations } = parseReviewResponse(raw);

  const reviewCreate = DocumentReview.create({
    userId: session.user.id,
    fileName,
    summary,
    findings,
    recommendations,
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
      summary,
      findings,
      recommendations,
    },
    { status: 201 }
  );
}
