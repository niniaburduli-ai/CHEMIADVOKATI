import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const LegislationDocSchema = new Schema(
  {
    title: { type: String, required: true },
    code: { type: String, required: true, index: true },
    articleNumber: { type: String, index: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [], index: true },
    sourceUrl: { type: String },
    embedding: { type: [Number] },
  },
  { timestamps: true }
);

LegislationDocSchema.index({ title: "text", content: "text", tags: "text" });

export type LegislationDocType = InferSchemaType<typeof LegislationDocSchema>;

export const LegislationDoc: Model<LegislationDocType> =
  (models.LegislationDoc as Model<LegislationDocType>) ||
  model<LegislationDocType>("LegislationDoc", LegislationDocSchema);
