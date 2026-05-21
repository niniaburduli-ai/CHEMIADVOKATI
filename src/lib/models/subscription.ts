import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    stripeCustomerId: { type: String, index: true },
    stripeSubId: { type: String, index: true },
    status: {
      type: String,
      enum: ["incomplete", "active", "past_due", "canceled", "trialing", "unpaid"],
      default: "incomplete",
    },
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema>;

export const Subscription: Model<SubscriptionDoc> =
  (models.Subscription as Model<SubscriptionDoc>) ||
  model<SubscriptionDoc>("Subscription", SubscriptionSchema);
