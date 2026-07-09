import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { GeneratedDocument } from "@/lib/models/generated-document";
import { GenerateTemplateSchema, DOC_TYPES } from "@/lib/validators";
import { renderTemplate } from "@/lib/legal/templates";
import { applyPlanExpiryIfDue } from "@/lib/plan-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const parsed = GenerateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  let user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  user = await applyPlanExpiryIfDue(user);
  const isAdmin = user.role === "admin";
  if (!isAdmin && (user.docTemplatesRemaining ?? 0) <= 0) {
    return NextResponse.json(
      { error: "Template quota exceeded. Please upgrade your plan." },
      { status: 403 }
    );
  }

  const { type, answers } = parsed.data;
  const { content, legalBasis } = renderTemplate(type, answers);
  const typeName = DOC_TYPES[type];
  const title = `${typeName} — ${new Date().toISOString().slice(0, 10)}`;

  const docCreate = GeneratedDocument.create({
    userId: session.user.id,
    title,
    type,
    content,
    legalBasis,
    source: "template",
  });
  const saveOps: Promise<unknown>[] = [docCreate];
  if (!isAdmin) {
    saveOps.push(
      User.findByIdAndUpdate(session.user.id, { $inc: { docTemplatesRemaining: -1 } })
    );
  }
  const [doc] = await Promise.all(saveOps);

  return NextResponse.json(
    { id: String((doc as { _id: unknown })._id), title, content, legalBasis },
    { status: 201 }
  );
}
