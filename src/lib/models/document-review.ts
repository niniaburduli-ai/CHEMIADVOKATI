import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { RISK_CATEGORIES, RISK_SEVERITIES } from "@/lib/legal/document-analysis";

const RiskFindingSchema = new Schema(
  {
    category: { type: String, enum: [...RISK_CATEGORIES], required: true },
    severity: { type: String, enum: [...RISK_SEVERITIES], required: true },
    title: { type: String, default: "" },
    explanation: { type: String, default: "" },
    recommendation: { type: String, default: "" },
  },
  { _id: false }
);

const DocumentRevisionSchema = new Schema(
  {
    text: { type: String, default: "" },
    summary: { type: String, default: "" },
    findings: { type: [RiskFindingSchema], default: [] },
    recommendations: { type: [String], default: [] },
    questions: { type: [String], default: [] },
    instruction: { type: String, default: "" },
    answers: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DocumentReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, default: "document" },
    summary: { type: String, required: true },
    findings: { type: [RiskFindingSchema], default: [] },
    recommendations: { type: [String], default: [] },
    sourceText: { type: String, default: "" },
    pages: { type: Number, default: 1 },
    creditsUsed: { type: Number, default: 1 },
    revisions: { type: [DocumentRevisionSchema], default: [] },
  },
  { timestamps: true }
);

export type DocumentReviewDoc = InferSchemaType<typeof DocumentReviewSchema> & { _id: unknown };

export const DocumentReview: Model<DocumentReviewDoc> =
  (models.DocumentReview as Model<DocumentReviewDoc>) ||
  model<DocumentReviewDoc>("DocumentReview", DocumentReviewSchema);
