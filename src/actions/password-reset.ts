"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { PasswordResetToken } from "@/lib/models/password-reset-token";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { ForgotPasswordSchema, ResetPasswordSchema } from "@/lib/validators";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function baseUrl(): string {
  return (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export type ForgotPasswordState =
  | {
      ok?: boolean;
      sent?: boolean;
      notRegistered?: boolean;
      error?: string;
      fields?: Record<string, string[] | undefined>;
      values?: { email?: string };
    }
  | undefined;

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const raw = { email: String(formData.get("email") ?? "") };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      fields: parsed.error.flatten().fieldErrors,
      values: { email: raw.email },
    };
  }

  const { email } = parsed.data;

  await dbConnect();
  const user = await User.findOne({ email }).lean();

  // Per product requirement: reject unknown emails outright (note: this allows
  // account enumeration — callers can learn which emails are registered).
  if (!user) {
    return { ok: false, notRegistered: true, values: { email } };
  }

  try {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    // Invalidate any prior reset tokens for this email, then issue one.
    await PasswordResetToken.deleteMany({ email });
    await PasswordResetToken.create({
      email,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    const resetUrl = `${baseUrl()}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error("password reset request failed:", err);
    return { ok: false, error: "ვერ მოხერხდა წერილის გაგზავნა. სცადეთ მოგვიანებით.", values: { email } };
  }

  return { ok: true, sent: true, values: { email } };
}

export type ResetPasswordState =
  | {
      ok?: boolean;
      done?: boolean;
      error?: string;
      fields?: Record<string, string[] | undefined>;
    }
  | undefined;

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const raw = {
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = ResetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fields: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.password !== confirmPassword) {
    return { ok: false, fields: { confirmPassword: ["პაროლები არ ემთხვევა"] } };
  }

  await dbConnect();

  const tokenHash = hashToken(parsed.data.token);
  const record = await PasswordResetToken.findOne({ tokenHash });

  // Reject missing, used, or expired tokens (TTL index may not have purged yet).
  if (!record || record.expiresAt.getTime() < Date.now()) {
    if (record) await PasswordResetToken.deleteOne({ _id: record._id });
    return { ok: false, error: "ბმული არასწორია ან ვადაგასულია. სცადეთ თავიდან." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await User.updateOne({ email: record.email }, { $set: { passwordHash } });

  // Single-use: clear every reset token for this account.
  await PasswordResetToken.deleteMany({ email: record.email });

  return { ok: true, done: true };
}
