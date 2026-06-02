import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    image: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    plan: { type: String, enum: ["free", "standard"], default: "free" },
    consultationsRemaining: { type: Number, default: 1 },
    resetAt: { type: Date },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: unknown };

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
