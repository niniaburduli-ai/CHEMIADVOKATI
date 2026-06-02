import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadBuffer } from "@/lib/cloudinary";
import { dbConnect } from "@/lib/db";
import { Upload } from "@/lib/models/upload";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedUploadType,
} from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field" },
      { status: 400 }
    );
  }

  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as AllowedUploadType)) {
    return NextResponse.json(
      { error: `Unsupported type. Allowed: ${ALLOWED_UPLOAD_TYPES.join(", ")}` },
      { status: 415 }
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max 2MB." },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadBuffer(buffer, {
      folder: `chemiadvokati/${session.user.id}`,
      filename: file.name,
    });

    await dbConnect();
    const doc = await Upload.create({
      userId: session.user.id,
      url: result.url,
      publicId: result.publicId,
      bytes: result.bytes,
      format: result.format,
      resourceType: result.resourceType,
      originalName: file.name,
    });

    return NextResponse.json({ id: String(doc._id), ...result }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 502 });
  }
}
