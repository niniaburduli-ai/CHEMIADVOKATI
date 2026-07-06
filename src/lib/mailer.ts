import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Gmail SMTP transport, created once and reused across hot reloads (same
 * singleton trick as the Mongoose connection in lib/db.ts).
 */
declare global {
  var mailerTransport: Transporter | undefined;
}

function getTransport(): Transporter {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER / SMTP_PASS are not set");
  }

  if (global.mailerTransport) return global.mailerTransport;

  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  global.mailerTransport = transport;
  return transport;
}

export function fromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

/** Bilingual (Georgian-first) password-reset email with the magic link. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transport = getTransport();

  const subject = "პაროლის აღდგენა · Reset your password";

  const text = [
    "პაროლის აღდგენა",
    "მიიღეთ ეს წერილი, რადგან მოითხოვეთ პაროლის აღდგენა.",
    "გადადით ბმულზე ახალი პაროლის დასაყენებლად (ბმული მოქმედებს 1 საათი):",
    resetUrl,
    "",
    "თუ ეს თქვენ არ მოგითხოვიათ, უბრალოდ უგულებელყავით ეს წერილი.",
    "",
    "—",
    "",
    "Reset your password",
    "You received this email because a password reset was requested.",
    "Open the link below to set a new password (valid for 1 hour):",
    resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");

  const html = `
  <div style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden">
      <tr><td style="height:4px;background:#4338ca"></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700">პაროლის აღდგენა</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b">
          მიიღეთ ეს წერილი, რადგან მოითხოვეთ პაროლის აღდგენა. დააჭირეთ ღილაკს ახალი პაროლის დასაყენებლად. ბმული მოქმედებს <strong>1 საათი</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4338ca;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
          ახალი პაროლის დაყენება
        </a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa">
          თუ ღილაკი არ მუშაობს, დააკოპირეთ ეს ბმული ბრაუზერში:<br>
          <a href="${resetUrl}" style="color:#4338ca;word-break:break-all">${resetUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa">
          თუ ეს თქვენ არ მოგითხოვიათ, უგულებელყავით ეს წერილი.<br>
          <em>If you didn't request a password reset, you can safely ignore this email.</em>
        </p>
      </td></tr>
    </table>
  </div>`;

  await transport.sendMail({ from: fromAddress(), to, subject, text, html });
}

/** Notifies the configured contact address when a visitor submits site feedback. */
export async function sendFeedbackEmail(
  to: string,
  feedback: { rating: number; message: string }
): Promise<void> {
  const transport = getTransport();

  const stars = "★".repeat(feedback.rating) + "☆".repeat(5 - feedback.rating);
  const subject = `ახალი უკუკავშირი · New feedback (${feedback.rating}/5)`;
  const escapedMessage = feedback.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const text = [
    "ახალი უკუკავშირი საიტიდან",
    `შეფასება: ${stars} (${feedback.rating}/5)`,
    "",
    feedback.message,
  ].join("\n");

  const html = `
  <div style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden">
      <tr><td style="height:4px;background:#4338ca"></td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700">ახალი უკუკავშირი</h1>
        <p style="margin:0 0 16px;font-size:20px;letter-spacing:2px;color:#f59e0b">${stars}</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3f3f46;white-space:pre-wrap">${escapedMessage}</p>
      </td></tr>
    </table>
  </div>`;

  await transport.sendMail({ from: fromAddress(), to, subject, text, html });
}
