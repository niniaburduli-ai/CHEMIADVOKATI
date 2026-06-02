import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { Upload } from "@/lib/models/upload";
import { destroyAsset } from "@/lib/cloudinary";
import { UploadNoteSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UploadNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await dbConnect();
  const doc = await Upload.findByIdAndUpdate(
    id,
    { note: parsed.data.note },
    { new: true }
  ).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id, note: (doc as { note?: string }).note ?? "" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();
  const doc = await Upload.findById(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await destroyAsset(doc.publicId, doc.resourceType);
  } catch {
    // Cloudinary asset may already be gone — proceed to remove the DB record.
  }
  await doc.deleteOne();

  return NextResponse.json({ id, deleted: true });
}
