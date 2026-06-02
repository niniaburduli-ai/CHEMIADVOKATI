import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Upload } from "@/lib/models/upload";
import { destroyAsset } from "@/lib/cloudinary";
import { AdminUserUpdateSchema } from "@/lib/validators";

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

  const parsed = AdminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Guard: an admin cannot demote themselves (avoids locking out the last admin).
  if (id === session.user.id && parsed.data.role === "user") {
    return NextResponse.json(
      { error: "Cannot remove your own admin role" },
      { status: 400 }
    );
  }

  await dbConnect();
  const doc = await User.findByIdAndUpdate(id, { $set: parsed.data }, { new: true })
    .select("-passwordHash")
    .lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: String((doc as { _id: unknown })._id),
    name: doc.name,
    email: doc.email,
    role: doc.role ?? "user",
    plan: doc.plan ?? "free",
    consultationsRemaining: doc.consultationsRemaining ?? 0,
  });
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
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cascade: remove the user's uploaded assets from Cloudinary, then DB records.
  const uploads = await Upload.find({ userId: id });
  for (const up of uploads) {
    try {
      await destroyAsset(up.publicId, up.resourceType);
    } catch {
      // ignore — asset may already be deleted
    }
  }
  await Upload.deleteMany({ userId: id });
  await user.deleteOne();

  return NextResponse.json({ id, deleted: true, uploadsRemoved: uploads.length });
}
