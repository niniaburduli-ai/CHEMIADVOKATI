import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { Consultation } from "@/lib/models/consultation";
import { ConsultationCreateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const items = await Consultation.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    items: items.map((c) => ({
      id: String((c as { _id: unknown })._id),
      question: c.question,
      answer: c.answer,
      sources: c.sources ?? [],
      createdAt: (c as { createdAt?: Date }).createdAt,
    })),
  });
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

  await dbConnect();
  const created = await Consultation.create({
    userId: session.user.id,
    question: parsed.data.question,
    answer: "[placeholder — AI not wired yet; Phase 4]",
    sources: [],
  });

  return NextResponse.json(
    {
      id: String(created._id),
      question: created.question,
      answer: created.answer,
    },
    { status: 201 }
  );
}
