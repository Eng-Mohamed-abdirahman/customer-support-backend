"use client"

import {
  Building2,
  Crown,
  DollarSign,
  Layers3,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { PlanDashboardStats } from "@/types/plan"
import { cn } from "@/lib/utils"

type PlanStatsRowProps = {
  stats: PlanDashboardStats | null
  isLoading: boolean
}

const statConfig = [
  {
    key: "totalPlans" as const,
    label: "Total Plans",
    helper: "Subscription tiers in catalog",
    icon: Layers3,
    tone: "sky",
  },
  {
    key: "totalActiveOrganizations" as const,
    label: "Active Organizations",
    helper: "Tenants with active subscriptions",
    icon: Building2,
    tone: "indigo",
  },
  {
    key: "monthlyRevenue" as const,
    label: "Monthly Revenue",
    helper: "Normalized recurring revenue",
    icon: DollarSign,
    tone: "emerald",
    format: (value: number) =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value),
  },
  {
    key: "enterpriseCustomers" as const,
    label: "Enterprise Customers",
    helper: "On enterprise-grade plans",
    icon: Crown,
    tone: "violet",
  },
]

const toneClasses: Record<string, string> = {
  sky: "bg-[#13B8A6]/10 text-[#13B8A6]",
  indigo: "bg-[#12304A]/10 text-[#12304A]",
  emerald: "bg-emerald-500/10 text-emerald-700",
  violet: "bg-violet-500/10 text-violet-700",
}

export function PlanStatsRow({ stats, isLoading }: PlanStatsRowProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statConfig.map((item) => {
        const Icon = item.icon
        const rawValue = stats?.[item.key] ?? 0
        const value =
          item.format?.(rawValue as number) ?? Number(rawValue).toLocaleString()

        return (
          <Card
            key={item.key}
            className="border-slate-200/80 bg-white py-0 shadow-[0_1px_2px_rgba(2,62,138,0.04),0_8px_24px_rgba(2,62,138,0.06)]"
          >
            <CardContent className="flex items-start justify-between gap-4 p-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-semibold tracking-tight text-slate-900">
                    {value}
                  </p>
                )}
                <p className="text-xs text-slate-500">{item.helper}</p>
              </div>
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                  toneClasses[item.tone]
                )}
              >
                <Icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
