"use client"

import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts"
import {
  Users,
  CreditCard,
  Coins,
  MessagesSquare,
  FileText,
  FileSearch,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type Stats = {
  totals: {
    users: number
    consultations: number
    documents: number
    reviews: number
    uploads: number
    admins: number
    activeSubscriptions: number
  }
  monthlyRevenueMinor: number
  currency: string
  planDistribution: { key: string; name: string; count: number }[]
  signups: { date: string; count: number }[]
  consultations: { date: string; count: number }[]
}

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

const signupConfig = {
  count: { label: "რეგისტრაცია", color: "var(--chart-1)" },
} satisfies ChartConfig

const consultConfig = {
  count: { label: "კონსულტაცია", color: "var(--chart-2)" },
} satisfies ChartConfig

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function shortDate(iso: string): string {
  return iso.slice(5) // MM-DD
}

export function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(({ data, error }) => {
        if (data) setStats(data)
        else setError(error ?? "შეცდომა")
      })
      .catch(() => setError("ქსელის შეცდომა"))
  }, [])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!stats)
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> იტვირთება…
      </div>
    )

  const revenue = (stats.monthlyRevenueMinor / 100).toLocaleString("ka-GE", {
    maximumFractionDigits: 0,
  })

  const pieData = stats.planDistribution.map((p) => ({ name: p.name, value: p.count }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="მომხმარებლები" value={stats.totals.users} icon={Users} />
        <StatCard label="აქტიური გამოწერა" value={stats.totals.activeSubscriptions} icon={CreditCard} />
        <StatCard label={`თვიური შემოსავალი (${stats.currency})`} value={revenue} icon={Coins} />
        <StatCard label="კონსულტაციები" value={stats.totals.consultations} icon={MessagesSquare} />
        <StatCard label="დოკუმენტები" value={stats.totals.documents} icon={FileText} />
        <StatCard label="მიმოხილვები" value={stats.totals.reviews} icon={FileSearch} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">რეგისტრაციები (30 დღე)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={signupConfig} className="h-[240px] w-full">
              <AreaChart data={stats.signups} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <defs>
                  <linearGradient id="fillSignup" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area dataKey="count" type="monotone" stroke="var(--color-count)" fill="url(#fillSignup)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">კონსულტაციები (30 დღე)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={consultConfig} className="h-[240px] w-full">
              <BarChart data={stats.consultations} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} tickLine={false} axisLine={false} minTickGap={24} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">გეგმების განაწილება</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
            <ChartContainer config={{}} className="h-[240px] w-full max-w-[320px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} strokeWidth={3}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="space-y-2 text-sm">
              {stats.planDistribution.map((p, i) => (
                <li key={p.key} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-[3px]"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">— {p.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
