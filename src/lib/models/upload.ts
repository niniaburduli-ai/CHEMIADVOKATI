import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const UploadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true, index: true },
    bytes: { type: Number, required: true },
    format: { type: String },
    resourceType: { type: String, required: true },
    originalName: { type: String },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

UploadSchema.index({ createdAt: -1 });

export type UploadDoc = InferSchemaType<typeof UploadSchema> & { _id: unknown };

export const Upload: Model<UploadDoc> =
  (models.Upload as Model<UploadDoc>) || model<UploadDoc>("Upload", UploadSchema);
