import { z } from "zod";
import { TEMPLATE_TYPES } from "@/lib/legal/templates";
import { MAX_ANALYSIS_TEXT } from "@/lib/legal/review-limits";

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

// All fields optional — voluntary contact/ID info shown only in the user's
// own profile, never fed into document generation (a document may be
// generated for someone other than the account holder).
export const ProfileUpdateSchema = z.object({
  firstName: z.string().trim().max(60).optional().default(""),
  lastName: z.string().trim().max(60).optional().default(""),
  personalNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("")
    .refine((v) => v === "" || /^\d{11}$/.test(v), {
      message: "პირადი ნომერი უნდა შედგებოდეს 11 ციფრისგან",
    }),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .default("")
    .refine((v) => v === "" || /^(\+?995)?5\d{8}$/.test(v.replace(/[\s-]/g, "")), {
      message: "არასწორი ტელეფონის ნომერი",
    }),
});
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

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

// Matches CustomSelection (@/lib/custom-plan-rates-config) exactly — every
// service key present, each either 0 (excluded) or one of the 5 fixed steps.
const customStepEnum = z.union([
  z.literal(0),
  z.literal(10),
  z.literal(50),
  z.literal(100),
  z.literal(200),
  z.literal(300),
]);
export const CustomCheckoutSchema = z
  .object({
    consultations: customStepEnum.default(0),
    docTemplates: customStepEnum.default(0),
    docGeneration: customStepEnum.default(0),
    docReview: customStepEnum.default(0),
  })
  .refine(
    (d) => d.consultations + d.docTemplates + d.docGeneration + d.docReview > 0,
    { message: "Select at least one service" }
  );
export type CustomCheckoutInput = z.infer<typeof CustomCheckoutSchema>;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

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
  // Bounded by MAX_ANALYSIS_TEXT, the same hard safety ceiling applied to
  // extracted file text — pasted text shouldn't get a looser cap than
  // uploads. Page-based credit cost (see reviewCreditCost) is what actually
  // scales spend with document length, not this validator.
  text: z.string().min(20).max(MAX_ANALYSIS_TEXT),
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
    // How many months an admin-assigned paid plan stays active before it
    // auto-reverts to free. Required whenever a non-free plan is assigned so
    // every manual grant has a defined expiration.
    planDurationMonths: z.coerce.number().int().min(1).max(60).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" })
  .refine((d) => d.plan === undefined || d.plan === "free" || d.planDurationMonths !== undefined, {
    message: "planDurationMonths is required when assigning a paid plan",
    path: ["planDurationMonths"],
  });
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
});
export type DocumentImproveInput = z.infer<typeof DocumentImproveSchema>;
