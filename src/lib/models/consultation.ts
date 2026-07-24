import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const SourceSchema = new Schema(
  {
    title: { type: String, required: true },
    code: { type: String },
    // Legacy field: a pre-flattened "მუხლი X პ.Y" string. Kept for consultations
    // saved before article/paragraph/subparagraph were split out below — new
    // rows populate the structured fields instead so grouping never has to
    // regex-reparse a concatenated string.
    articleNumber: { type: String },
    article: { type: String },
    paragraph: { type: String },
    subparagraph: { type: String },
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
    // Which model actually produced this answer — surfaced in the admin
    // panel's consultations table so free-tier usage/outages are visible
    // without reading server logs. Optional: older consultations predate
    // this field and just show "—".
    modelTier: {
      type: String,
      enum: ["free1", "free2", "cheap", "complex", "web", "cached"],
    },
  },
  { timestamps: true }
);

export type ConsultationDoc = InferSchemaType<typeof ConsultationSchema>;

export const Consultation: Model<ConsultationDoc> =
  (models.Consultation as Model<ConsultationDoc>) ||
  model<ConsultationDoc>("Consultation", ConsultationSchema);
