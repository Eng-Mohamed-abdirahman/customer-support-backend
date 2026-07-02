"use client"

import { MoreHorizontal } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OrganizationSubscriptionRow } from "@/types/plan"

type OrganizationsPlanTableProps = {
  rows: OrganizationSubscriptionRow[]
  isLoading: boolean
  onChangePlan?: (row: OrganizationSubscriptionRow) => void
  onRemovePlan?: (row: OrganizationSubscriptionRow) => void
}

const formatDate = (value: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (normalized === "trialing") return "border-sky-200 bg-sky-50 text-sky-700"
  if (normalized === "past_due" || normalized === "suspended")
    return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-50 text-slate-600"
}

export function OrganizationsPlanTable({
  rows,
  isLoading,
  onChangePlan,
  onRemovePlan,
}: OrganizationsPlanTableProps) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white py-0 shadow-[0_1px_2px_rgba(2,62,138,0.04),0_8px_24px_rgba(2,62,138,0.06)]">
      <CardHeader className="border-b border-slate-100 px-6 py-5">
        <CardTitle className="text-lg font-semibold text-slate-900">
          Organization Subscriptions
        </CardTitle>
        <CardDescription>
          Track plan assignments, billing cycles, and usage across all tenants.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-3 px-6 py-6">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No organizations have been assigned to a plan yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Organization</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Conversations Used</TableHead>
                  <TableHead>Storage Used</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.organizationId}-${row.planId}`}>
                    <TableCell className="font-medium text-slate-900">
                      {row.organizationName}
                    </TableCell>
                    <TableCell className="text-slate-700">{row.planName}</TableCell>
                    <TableCell className="capitalize text-slate-500">
                      {row.billingCycle}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusClass(row.subscriptionStatus)}`}
                      >
                        {row.subscriptionStatus.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(row.expiresAt)}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {row.conversationsUsed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {row.storageUsedGb.toFixed(2)} GB
                    </TableCell>
                    <TableCell className="text-slate-500">{row.assignedBy}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onChangePlan?.(row)}>
                            Change plan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onRemovePlan?.(row)}
                          >
                            Remove plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
