import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SourceSchema = new Schema(
  {
    title: { type: String, required: true },
    code: { type: String },
    articleNumber: { type: String },
    url: { type: String },
  },
  { _id: false }
);

const ConsultationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    sources: { type: [SourceSchema], default: [] },
  },
  { timestamps: true }
);

export type ConsultationDoc = InferSchemaType<typeof ConsultationSchema>;

export const Consultation: Model<ConsultationDoc> =
  (models.Consultation as Model<ConsultationDoc>) ||
  model<ConsultationDoc>("Consultation", ConsultationSchema);
