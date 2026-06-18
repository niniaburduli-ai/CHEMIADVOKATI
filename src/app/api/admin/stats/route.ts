import { NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin"
import { dbConnect } from "@/lib/db"
import { User } from "@/lib/models/user"
import { Consultation } from "@/lib/models/consultation"
import { GeneratedDocument } from "@/lib/models/generated-document"
import { DocumentReview } from "@/lib/models/document-review"
import { Upload } from "@/lib/models/upload"
import { getPlans } from "@/lib/plans-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type DayPoint = { date: string; count: number }
type DayBucket = { _id: string; count: number }

/** Daily-group aggregation pipeline over createdAt since a date. */
function dayPipeline(since: Date) {
  return [
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
  ]
}

/** Turn sparse day-buckets into a dense, zero-filled series of `days` days. */
function fillSeries(rows: DayBucket[], since: Date, days: number): DayPoint[] {
  const map = new Map(rows.map((r) => [r._id, r.count]))
  const out: DayPoint[] = []
  for (let i = 0; i < days; i++) {
    const key = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10)
    out.push({ date: key, count: map.get(key) ?? 0 })
  }
  return out
}

export async function GET() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await dbConnect()
  const DAYS = 30
  const since = new Date(Date.now() - (DAYS - 1) * 86400000)
  since.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    totalConsultations,
    totalDocs,
    totalReviews,
    totalUploads,
    adminCount,
    activeSubs,
    planAgg,
    signupRows,
    consultRows,
    paidAgg,
    plans,
  ] = await Promise.all([
    User.estimatedDocumentCount(),
    Consultation.estimatedDocumentCount(),
    GeneratedDocument.estimatedDocumentCount(),
    DocumentReview.estimatedDocumentCount(),
    Upload.estimatedDocumentCount(),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ subscriptionStatus: "active" }),
    User.aggregate<{ _id: string; count: number }>([
      { $group: { _id: { $ifNull: ["$plan", "free"] }, count: { $sum: 1 } } },
    ]),
    User.aggregate<DayBucket>(dayPipeline(since)),
    Consultation.aggregate<DayBucket>(dayPipeline(since)),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { subscriptionStatus: "active" } },
      { $group: { _id: { $ifNull: ["$plan", "free"] }, count: { $sum: 1 } } },
    ]),
    getPlans(),
  ])

  const priceByKey = new Map(plans.map((p) => [p.key, p.priceMinor]))
  const nameByKey = new Map(plans.map((p) => [p.key, p.name]))

  const planDistribution = planAgg
    .map((p) => ({ key: p._id, name: nameByKey.get(p._id) ?? p._id, count: p.count }))
    .sort((a, b) => b.count - a.count)

  let monthlyRevenueMinor = 0
  for (const row of paidAgg) {
    monthlyRevenueMinor += (priceByKey.get(row._id) ?? 0) * row.count
  }

  return NextResponse.json({
    data: {
      totals: {
        users: totalUsers,
        consultations: totalConsultations,
        documents: totalDocs,
        reviews: totalReviews,
        uploads: totalUploads,
        admins: adminCount,
        activeSubscriptions: activeSubs,
      },
      monthlyRevenueMinor,
      currency: "GEL",
      planDistribution,
      signups: fillSeries(signupRows, since, DAYS),
      consultations: fillSeries(consultRows, since, DAYS),
    },
  })
}
