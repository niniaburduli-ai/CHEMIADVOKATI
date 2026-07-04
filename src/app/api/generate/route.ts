import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { GenerateDocSchema, DOC_TYPES } from "@/lib/validators";
import { callOpenRouterChat } from "@/lib/ai-call";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `შენ ხარ ქართული იურიდიული დოკუმენტების გენერატორი.
შექმენი სრული, პროფესიონალური ქართული იურიდიული დოკუმენტი მომხმარებლის აღწერილობის მიხედვით.
გამოიყენე ოფიციალური ქართული სამართლებრივი ენა.
მნიშვნელოვანი მონაცემები (სახელები, თარიღები, თანხები, პირადი ნომრები), რომლებიც მომხმარებელმა მიუთითა, გამოკვეთე **მუქი შრიფტით** (markdown-ის ** სინტაქსით).
თუ კონკრეტული მონაცემი უცნობია და მომხმარებელს არ მიუთითებია, დატოვე [ბრეკეტებში].
დოკუმენტი უნდა იყოს კომპაქტური: სექციებს შორის მაქსიმუმ ერთი ცარიელი ხაზი, ზედმეტი დაშორებების გარეშე.
დოკუმენტი უნდა იყოს სრული, სტრუქტურირებული და გამოყენებადი შაბლონი.`;

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

  const parsed = GenerateDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docGenerationRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Document generation quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const typeName = DOC_TYPES[parsed.data.type];
  const userMsg = `დოკუმენტის ტიპი: ${typeName}\n\nდეტალები:\n${parsed.data.details}`;

  let content: string;
  try {
    content = await callOpenRouterChat(
      [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
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

  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

  const docCreate = GeneratedDocument.create({
    userId: session.user.id,
    title,
    type: parsed.data.type,
    content,
  });
  const saveOps: Promise<unknown>[] = [docCreate];
  if (!isAdmin) {
    saveOps.push(User.findByIdAndUpdate(session.user.id, { $inc: { docGenerationRemaining: -1 } }));
  }
  const [doc] = await Promise.all(saveOps);

  return NextResponse.json(
    { id: String((doc as { _id: unknown })._id), title, content },
    { status: 201 }
  );
}
