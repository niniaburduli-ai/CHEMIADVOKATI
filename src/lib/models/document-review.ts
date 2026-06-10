import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const DocumentReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, default: "document" },
    summary: { type: String, required: true },
    findings: { type: [String], default: [] },
    recommendations: { type: [String], default: [] },
  },
  { timestamps: true }
);

export type DocumentReviewDoc = InferSchemaType<typeof DocumentReviewSchema> & { _id: unknown };

export const DocumentReview: Model<DocumentReviewDoc> =
  (models.DocumentReview as Model<DocumentReviewDoc>) ||
  model<DocumentReviewDoc>("DocumentReview", DocumentReviewSchema);
