import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** One Flitt charge (invoice line) recorded from a verified callback. */
const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: String, required: true, index: true },
    paymentId: { type: String, index: true, unique: true }, // Flitt payment_id (unique per charge)
    plan: { type: String, enum: ["standard", "premium", "custom"], required: true },
    amount: { type: Number, required: true }, // minor units (1900 = 19.00 GEL)
    currency: { type: String, default: "GEL" },
    status: { type: String, default: "approved" }, // approved | declined | reversed | sandbox_test
    // True when this callback was signed with Flitt's sandbox/test credentials
    // (see isSandboxCredentials() in lib/flitt.ts) — never counted as real
    // revenue and never shown on the user's own billing/invoice history.
    sandbox: { type: Boolean, default: false },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema>;

export const Payment: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) || model<PaymentDoc>("Payment", PaymentSchema);
