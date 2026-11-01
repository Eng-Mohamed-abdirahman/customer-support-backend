"use client"

import {
  Check,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { PlanDashboardStats, SubscriptionPlan } from "@/types/plan"
import {
  buildPlanFeatures,
  formatPlanPrice,
  formatRelativeUpdated,
  isMostPopularPlan,
} from "@/components/dashboard/plans/plan-utils"

type PlanCardProps = {
  plan: SubscriptionPlan
  assignedCount: number
  stats: PlanDashboardStats | null
  isBusy?: boolean
  onEdit: (plan: SubscriptionPlan) => void
  onDelete: (plan: SubscriptionPlan) => void
  onDuplicate: (plan: SubscriptionPlan) => void
  onAssign: (plan: SubscriptionPlan) => void
  onViewSubscribers: (plan: SubscriptionPlan) => void
  onToggleStatus: (plan: SubscriptionPlan) => void
}

export function PlanCard({
  plan,
  assignedCount,
  stats,
  isBusy = false,
  onEdit,
  onDelete,
  onDuplicate,
  onAssign,
  onViewSubscribers,
  onToggleStatus,
}: PlanCardProps) {
  const features = buildPlanFeatures(plan)
  const popular = isMostPopularPlan(plan, stats ?? undefined)
  const isActive = plan.status === "active"

  return (
    <Card
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-slate-200/80 bg-white py-0 shadow-[0_1px_2px_rgba(2,62,138,0.04),0_12px_32px_rgba(2,62,138,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(2,62,138,0.12)]",
        popular && "border-[#13B8A6]/40 ring-1 ring-[#13B8A6]/20"
      )}
    >
      {popular ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      ) : null}

      <CardHeader className="space-y-4 px-6 pt-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">
                {plan.name}
              </h3>
              {popular ? (
                <Badge className="rounded-full border-0 bg-primary px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Most Popular
                </Badge>
              ) : null}
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {formatPlanPrice(plan)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide",
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              )}
            >
              {isActive ? "Active" : "Disabled"}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-slate-500"
                  disabled={isBusy}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(plan)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(plan)}>
                  <Copy className="size-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssign(plan)}>
                  <UserPlus className="size-4" />
                  Assign Organizations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewSubscribers(plan)}>
                  <Users className="size-4" />
                  View Subscribers
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleStatus(plan)}>
                  {isActive ? "Disable plan" : "Enable plan"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(plan)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {plan.description ? (
          <p className="text-sm leading-relaxed text-slate-500">{plan.description}</p>
        ) : null}
      </CardHeader>

      <CardContent className="flex-1 px-6 py-5">
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#13B8A6]/10 text-[#13B8A6]">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="mt-auto flex-col items-stretch gap-4 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            <span className="font-semibold text-slate-800">{assignedCount}</span>{" "}
            organizations
          </span>
          <span>Updated {formatRelativeUpdated(plan.updatedAt)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-200 bg-white"
            onClick={() => onEdit(plan)}
            disabled={isBusy}
          >
            Edit
          </Button>
          <Button
            type="button"
            className="h-9 rounded-xl bg-primary text-white hover:opacity-90"
            onClick={() => onAssign(plan)}
            disabled={isBusy || !isActive}
          >
            Assign
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
