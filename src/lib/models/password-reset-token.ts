import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Single-use password-reset tokens. We store only the SHA-256 hash of the
 * token — the raw token lives only in the emailed magic link, so a DB leak
 * never yields a usable reset link. Consumed tokens are deleted; unused ones
 * expire automatically via the TTL index on `expiresAt`.
 */
const PasswordResetTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    // TTL index: Mongo purges the doc once `expiresAt` passes.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export type PasswordResetTokenDoc = InferSchemaType<typeof PasswordResetTokenSchema> & {
  _id: unknown;
};

export const PasswordResetToken: Model<PasswordResetTokenDoc> =
  (models.PasswordResetToken as Model<PasswordResetTokenDoc>) ||
  model<PasswordResetTokenDoc>("PasswordResetToken", PasswordResetTokenSchema);
