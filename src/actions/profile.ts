"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { ProfileUpdateSchema } from "@/lib/validators";

export type ProfileUpdateState =
  | {
      ok?: boolean;
      error?: string;
      fields?: Record<string, string[] | undefined>;
    }
  | undefined;

export async function updateProfileAction(
  _prev: ProfileUpdateState,
  formData: FormData
): Promise<ProfileUpdateState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    personalNumber: String(formData.get("personalNumber") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  };

  const parsed = ProfileUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fields: parsed.error.flatten().fieldErrors };
  }

  await dbConnect();
  await User.updateOne({ _id: session.user.id }, { $set: parsed.data });
  revalidatePath("/dashboard");

  return { ok: true };
}
