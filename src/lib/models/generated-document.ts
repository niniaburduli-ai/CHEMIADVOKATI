import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GeneratedDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true },
    legalBasis: { type: String, default: "" },
    source: { type: String, enum: ["ai", "template"], default: "ai" },
    // Sum of the generation call's cost + the citation-verification call's
    // cost (0 when citations came from the doc-type cache). 0 for documents
    // saved before cost tracking existed.
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type GeneratedDocumentDoc = InferSchemaType<typeof GeneratedDocumentSchema> & { _id: unknown };

export const GeneratedDocument: Model<GeneratedDocumentDoc> =
  (models.GeneratedDocument as Model<GeneratedDocumentDoc>) ||
  model<GeneratedDocumentDoc>("GeneratedDocument", GeneratedDocumentSchema);
