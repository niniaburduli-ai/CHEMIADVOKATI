import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const EMAIL_TYPES = [
  "password-reset",
  "welcome",
  "payment-confirmation",
  "payment-failed",
  "payment-reminder",
  "feedback",
  "balance-deduction",
] as const;
export type EmailType = (typeof EMAIL_TYPES)[number];

/** Audit-grade types kept forever — archived (soft-deleted) instead of TTL-purged or hard-deleted. */
const PERMANENT_TYPES = new Set<EmailType>([
  "feedback",
  "balance-deduction",
  "payment-confirmation",
  "payment-failed",
]);

export function isPermanentEmailType(type: string): boolean {
  return PERMANENT_TYPES.has(type as EmailType);
}

/** 30-day auto-expire for everything except the permanent audit types. */
export function computeExpireAt(type: EmailType): Date | undefined {
  return PERMANENT_TYPES.has(type) ? undefined : new Date(Date.now() + RETENTION_MS);
}

const EmailLogSchema = new Schema(
  {
    to: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: EMAIL_TYPES },
    status: { type: String, required: true, enum: ["sent", "failed"] },
    error: { type: String, trim: true },
    // Set only for non-permanent types; the TTL index purges the doc once this
    // passes. Permanent types leave this unset, so they're never auto-purged.
    expireAt: { type: Date },
    // Soft-delete for permanent types: hides the row from the admin list
    // without wiping the underlying audit record.
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EmailLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export type EmailLogDoc = InferSchemaType<typeof EmailLogSchema> & { _id: unknown };

export const EmailLog: Model<EmailLogDoc> =
  (models.EmailLog as Model<EmailLogDoc>) || model<EmailLogDoc>("EmailLog", EmailLogSchema);
