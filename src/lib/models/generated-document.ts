import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const GeneratedDocumentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export type GeneratedDocumentDoc = InferSchemaType<typeof GeneratedDocumentSchema> & { _id: unknown };

export const GeneratedDocument: Model<GeneratedDocumentDoc> =
  (models.GeneratedDocument as Model<GeneratedDocumentDoc>) ||
  model<GeneratedDocumentDoc>("GeneratedDocument", GeneratedDocumentSchema);
