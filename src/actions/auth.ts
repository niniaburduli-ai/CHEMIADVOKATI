"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { RegisterSchema, LoginSchema } from "@/lib/validators";

export type AuthFormState =
  | {
      ok?: false;
      error?: string;
      fields?: Record<string, string[] | undefined>;
      values?: { name?: string; email?: string };
    }
  | undefined;

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fields: parsed.error.flatten().fieldErrors,
      values: { name: raw.name, email: raw.email },
    };
  }

  await dbConnect();
  const existing = await User.findOne({ email: parsed.data.email }).lean();
  if (existing) {
    return {
      ok: false,
      error: "ეს ელ. ფოსტა უკვე გამოყენებულია",
      values: { name: parsed.data.name, email: parsed.data.email },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    plan: "free",
    consultationsRemaining: 1,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "რეგისტრაცია წარმატებით დასრულდა, შედი თავიდან" };
    }
    throw err;
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fields: parsed.error.flatten().fieldErrors,
      values: { email: raw.email },
    };
  }

  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: "ელ. ფოსტა ან პაროლი არასწორია",
        values: { email: parsed.data.email },
      };
    }
    throw err;
  }

  redirect(callbackUrl);
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function googleSignInAction(formData: FormData) {
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");
  await signIn("google", { redirectTo: callbackUrl });
}
