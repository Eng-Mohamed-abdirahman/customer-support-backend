import { CircleDot } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SectionMetric = {
  label: string
  value: string
  change: string
}

type SectionStatus = "Healthy" | "Watch" | "Needs attention"

type SectionRecord = {
  title: string
  subtitle: string
  value: string
  status: SectionStatus
}

type SectionHighlight = {
  label: string
  note: string
}

type DashboardSectionPageTemplateProps = {
  title: string
  description: string
  metrics: SectionMetric[]
  recordsTitle: string
  recordsDescription: string
  records: SectionRecord[]
  highlights: SectionHighlight[]
}

const statusClassNameMap: Record<SectionStatus, string> = {
  Healthy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  Watch: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "Needs attention": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

export function DashboardSectionPageTemplate({
  title,
  description,
  metrics,
  recordsTitle,
  recordsDescription,
  records,
  highlights,
}: DashboardSectionPageTemplateProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <p className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs text-muted-foreground">
          Last updated just now
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-0">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tracking-tight">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pt-0">
              <p className="text-xs text-muted-foreground">{metric.change}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card/95 py-0">
          <CardHeader className="border-b border-border/60 py-4">
            <CardTitle className="text-base">{recordsTitle}</CardTitle>
            <CardDescription>{recordsDescription}</CardDescription>
          </CardHeader>

          <CardContent className="px-0 py-0">
            {records.map((record) => (
              <div
                key={record.title}
                className="flex items-start justify-between gap-3 border-b border-border/50 px-6 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{record.title}</p>
                  <p className="text-xs text-muted-foreground">{record.subtitle}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{record.value}</p>
                  <span
                    className={cn(
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      statusClassNameMap[record.status]
                    )}
                  >
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 py-0">
          <CardHeader className="py-4">
            <CardTitle className="text-base">Data points to keep in sync</CardTitle>
            <CardDescription>
              These placeholders are ready for API responses when backend endpoints are connected.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {highlights.map((highlight) => (
                <li key={highlight.label} className="flex items-start gap-2">
                  <CircleDot className="mt-0.5 size-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{highlight.label}</p>
                    <p className="text-xs text-muted-foreground">{highlight.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
