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

export const LegislationQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  code: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
});
export type LegislationQueryInput = z.infer<typeof LegislationQuerySchema>;
