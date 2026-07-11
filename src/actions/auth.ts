"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const consentAccepted = formData.get("consentAccepted");
  const rawCallbackUrl = String(formData.get("callbackUrl") ?? "");
  // Only allow same-site relative paths to prevent open redirect.
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

  if (consentAccepted !== "on") {
    return {
      ok: false,
      fields: { consentAccepted: ["გთხოვთ დაეთანხმოთ მომსახურების პირობებსა და კონფიდენციალურობის პოლიტიკას"] },
      values: { name: raw.name, email: raw.email },
    };
  }

  if (raw.password !== confirmPassword) {
    return {
      ok: false,
      fields: { confirmPassword: ["პაროლები არ ემთხვევა"] },
      values: { name: raw.name, email: raw.email },
    };
  }

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
    docTemplatesRemaining: 20,
    consentAcceptedAt: new Date(),
    consentVersion: "1.0",
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

  revalidatePath("/", "layout");
  redirect(callbackUrl);
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

  // Only allow same-site relative paths to prevent open redirect.
  const rawCallbackUrl = String(formData.get("callbackUrl") ?? "");
  const callbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/";

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

  revalidatePath("/", "layout");
  redirect(callbackUrl);
}

export async function logoutAction() {
  // Sessions created before the cookie-domain fix left a host-only copy of
  // these cookies in browsers, which now coexists with the domain-scoped
  // one from the same name and makes login state ambiguous. Clear every
  // variant explicitly so old sessions don't linger after logout.
  const store = await cookies();
  const rootDomain =
    process.env.VERCEL_ENV === "production" ? ".chemiiuristi.com" : undefined;
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
  ]) {
    store.delete({ name, path: "/" });
    if (rootDomain) store.delete({ name, path: "/", domain: rootDomain });
  }

  revalidatePath("/", "layout");
  await signOut({ redirectTo: "/" });
}

export async function googleSignInAction(formData: FormData) {
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");
  await signIn("google", { redirectTo: callbackUrl });
}
