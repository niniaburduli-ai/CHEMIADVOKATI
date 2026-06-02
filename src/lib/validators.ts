import { z } from "zod";

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

export const ConsultationCreateSchema = z.object({
  question: z.string().min(5).max(2000),
});
export type ConsultationCreateInput = z.infer<typeof ConsultationCreateSchema>;

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

export const AdminUserUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    role: z.enum(["user", "admin"]).optional(),
    plan: z.enum(["free", "standard"]).optional(),
    consultationsRemaining: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>;
