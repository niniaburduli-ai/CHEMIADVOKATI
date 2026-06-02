import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { Upload } from "@/lib/models/upload";
import { AdminDashboard, type UploadRow, type UserRow } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/dashboard");

  await dbConnect();

  const [uploads, users] = await Promise.all([
    Upload.find()
      .sort({ createdAt: -1 })
      .limit(500)
      .populate({ path: "userId", model: User, select: "name email" })
      .lean(),
    User.find().select("-passwordHash").sort({ createdAt: -1 }).limit(500).lean(),
  ]);

  const uploadRows: UploadRow[] = uploads.map((u) => {
    const owner = u.userId as unknown as
      | { _id: unknown; name?: string; email?: string }
      | null;
    return {
      id: String((u as { _id: unknown })._id),
      url: u.url,
      publicId: u.publicId,
      bytes: u.bytes,
      format: u.format ?? null,
      resourceType: u.resourceType,
      originalName: u.originalName ?? null,
      note: u.note ?? "",
      createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? null,
      owner: owner
        ? { name: owner.name ?? null, email: owner.email ?? null }
        : null,
    };
  });

  const userRows: UserRow[] = users.map((u) => ({
    id: String((u as { _id: unknown })._id),
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    role: (u.role ?? "user") as "user" | "admin",
    plan: (u.plan ?? "free") as "free" | "standard",
    consultationsRemaining: u.consultationsRemaining ?? 0,
    createdAt: (u as { createdAt?: Date }).createdAt?.toISOString() ?? null,
  }));

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">ადმინ პანელი</h1>
        <p className="text-muted-foreground mt-1">
          მომხმარებლები და ატვირთული ფაილები
        </p>
      </div>
      <AdminDashboard
        initialUploads={uploadRows}
        initialUsers={userRows}
        currentUserId={session.user.id}
      />
    </div>
  );
}
