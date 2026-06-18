import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    // Plan is a DB-backed plan key (see models/Plan.ts) — no fixed enum.
    plan: { type: String, default: "free", index: true },
    consultationsRemaining: { type: Number, default: 1 },
    docGenerationRemaining: { type: Number, default: 1 },
    docReviewRemaining: { type: Number, default: 1 },
    resetAt: { type: Date },
    // Flitt Payments subscription state.
    flittOrderId: { type: String, index: true },
    flittPaymentId: { type: String },
    subscriptionStatus: { type: String, default: "" }, // pending | active | declined | expired | reversed
    consentAcceptedAt: { type: Date },
    consentVersion: { type: String, default: "" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: unknown };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
