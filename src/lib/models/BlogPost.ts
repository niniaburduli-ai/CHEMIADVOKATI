import { Schema, model, models, type Model } from "mongoose"

const BlogPostSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    body: { type: Schema.Types.Mixed, default: {} },
    excerpt: { type: String, default: "" },
    coverImageUrl: { type: String, default: "" },
    coverImagePubId: { type: String, default: "" },
    category: { type: Schema.Types.ObjectId, ref: "BlogCategory" },
    tags: [{ type: String }],
    author: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published", "hidden"], default: "draft", index: true },
    publishedAt: { type: Date },
    locale: { type: String, default: "ka", index: true },
  },
  { timestamps: true }
)

export type BlogPostDoc = {
  title: string; slug: string; body: object; excerpt: string
  coverImageUrl: string; coverImagePubId: string; category: unknown
  tags: string[]; author: string; status: string; publishedAt?: Date
  locale: string; _id: unknown; createdAt: Date; updatedAt: Date
}

export const BlogPost: Model<BlogPostDoc> =
  (models.BlogPost as Model<BlogPostDoc>) || model<BlogPostDoc>("BlogPost", BlogPostSchema)
