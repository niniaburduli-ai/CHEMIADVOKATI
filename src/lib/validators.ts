import { z } from "zod";
import { TEMPLATE_TYPES } from "@/lib/legal/templates";

export const RegisterSchema = z.object({
  name: z.string().min(2, { message: "სახელი მინიმუმ 2 სიმბოლო" }).max(80).trim(),
  email: z.string().email({ message: "არასწორი ელ. ფოსტა" }).toLowerCase().trim(),
  password: z
    .string()
    .min(8, { message: "პაროლი მინიმუმ 8 სიმბოლო" })
    .max(128),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email({ message: "არასწორი ელ. ფოსტა" }).toLowerCase().trim(),
  password: z.string().min(1, { message: "შეიყვანე პაროლი" }),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "არასწორი ელ. ფოსტა" }).toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1).max(200),
  password: z
    .string()
    .min(8, { message: "პაროლი მინიმუმ 8 სიმბოლო" })
    .max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ConsultationCreateSchema = z.object({
  question: z.string().min(5).max(2000),
});
export type ConsultationCreateInput = z.infer<typeof ConsultationCreateSchema>;

// Plan key validated against the DB in the checkout route (plans are dynamic).
export const PLAN_KEY_RE = /^[a-z0-9-]+$/;
export const CheckoutSchema = z.object({
  plan: z.string().trim().min(1).max(40).regex(PLAN_KEY_RE),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export const LegislationQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});
export type LegislationQueryInput = z.infer<typeof LegislationQuerySchema>;

export const UploadNoteSchema = z.object({
  note: z.string().trim().max(500).default(""),
});
export type UploadNoteInput = z.infer<typeof UploadNoteSchema>;

export const DOC_TYPES = {
  complaint: "საჩივარი",
  "rental-agreement": "ქირავნობის ხელშეკრულება",
  "employment-contract": "შრომის ხელშეკრულება",
  "power-of-attorney": "მინდობილობა",
  "demand-letter": "სამართლებრივი მოთხოვნა",
  "termination-notice": "სამსახურიდან გათავისუფლება",
} as const;

export type DocType = keyof typeof DOC_TYPES;

export const GenerateDocSchema = z.object({
  type: z.enum(["complaint", "demand-letter"]),
  details: z.string().min(10).max(2000),
});
export type GenerateDocInput = z.infer<typeof GenerateDocSchema>;

export const GenerateTemplateSchema = z.object({
  type: z.enum(TEMPLATE_TYPES),
  answers: z.record(z.string(), z.string().max(500)).refine(
    (obj) => Object.keys(obj).length <= 30,
    { message: "Too many fields" }
  ),
});
export type GenerateTemplateInput = z.infer<typeof GenerateTemplateSchema>;

export const UpdateGeneratedDocSchema = z.object({
  content: z.string().min(1).max(20000),
});
export type UpdateGeneratedDocInput = z.infer<typeof UpdateGeneratedDocSchema>;

export const ReviewDocTextSchema = z.object({
  text: z.string().min(20).max(10000),
  fileName: z.string().max(200).optional(),
});
export type ReviewDocTextInput = z.infer<typeof ReviewDocTextSchema>;

export const AdminUserUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(["user", "admin"]).optional(),
    // Plan keys are dynamic (DB-backed); validate shape only.
    plan: z.string().trim().min(1).max(40).regex(PLAN_KEY_RE).optional(),
    consultationsRemaining: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>;

export const FeedbackCreateSchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    message: z.string().trim().max(2000).optional().default(""),
  })
  .refine((d) => d.rating != null || d.message.length > 0, {
    message: "Rating or message is required",
  });
export type FeedbackCreateInput = z.infer<typeof FeedbackCreateSchema>;

export const DocumentImproveSchema = z.object({
  reviewId: z.string().trim().min(1).max(64),
  instruction: z.string().trim().max(2000).optional().default(""),
  answers: z.record(z.string(), z.string().max(2000)).optional().default({}),
});
export type DocumentImproveInput = z.infer<typeof DocumentImproveSchema>;
