import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    plan: { type: String, enum: ["free", "standard", "premium"], default: "free" },
    consultationsRemaining: { type: Number, default: 1 },
    docGenerationRemaining: { type: Number, default: 1 },
    docReviewRemaining: { type: Number, default: 1 },
    resetAt: { type: Date },
    // Dodo Payments subscription state.
    dodoCustomerId: { type: String, index: true },
    dodoSubscriptionId: { type: String, index: true },
    subscriptionStatus: { type: String, default: "" }, // active | on_hold | cancelled | expired | failed
    consentAcceptedAt: { type: Date },
    consentVersion: { type: String, default: "" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: unknown };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
