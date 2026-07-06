import { dbConnect } from "@/lib/db";
import { Feedback } from "@/lib/models/Feedback";

export type FeedbackSummary = { percentage: number; avgRating: number; count: number };

const ZERO: FeedbackSummary = { percentage: 0, avgRating: 0, count: 0 };

/** Live satisfaction percentage + avg rating (out of 5) for the homepage review card and stats. */
export async function getFeedbackSummary(): Promise<FeedbackSummary> {
  try {
    await dbConnect();
    const [agg] = await Feedback.aggregate<{ avg: number; count: number }>([
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (!agg || agg.count === 0) return ZERO;
    return {
      percentage: Math.round((agg.avg / 5) * 100),
      avgRating: Math.round(agg.avg * 10) / 10,
      count: agg.count,
    };
  } catch {
    return ZERO;
  }
}
