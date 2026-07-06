import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const FeedbackSchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

export type FeedbackDoc = InferSchemaType<typeof FeedbackSchema> & { _id: unknown };

export const Feedback: Model<FeedbackDoc> =
  (models.Feedback as Model<FeedbackDoc>) || model<FeedbackDoc>("Feedback", FeedbackSchema);
