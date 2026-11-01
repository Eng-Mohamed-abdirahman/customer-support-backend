"use client"

import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPlanOrganizations } from "@/services/plan.service"
import type { SubscriptionPlan } from "@/types/plan"

type SubscribersSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: SubscriptionPlan | null
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

export function SubscribersSheet({ open, onOpenChange, plan }: SubscribersSheetProps) {
  const subscribersQuery = useQuery({
    queryKey: ["plan-organizations", plan?.id],
    queryFn: async () => {
      const result = await getPlanOrganizations(plan!.id, { limit: 100 })
      return result.organizations.map((org) => ({
        organizationId: org.organizationId,
        organizationName: org.organizationName,
        billingCycle: org.billingCycle,
        subscriptionStatus: org.subscriptionStatus,
        expiresAt: org.expiresAt,
      }))
    },
    enabled: open && Boolean(plan),
  })
  const rows = subscribersQuery.data ?? []
  const isLoading = subscribersQuery.isFetching

  useEffect(() => {
    if (subscribersQuery.error) {
      toast.error(subscribersQuery.error.message || "Failed to load subscribers")
    }
  }, [subscribersQuery.error])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{plan?.name} Subscribers</SheetTitle>
          <SheetDescription>
            Organizations currently assigned to this subscription plan.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No organizations are subscribed to this plan yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.organizationId}>
                    <TableCell className="font-medium">{row.organizationName}</TableCell>
                    <TableCell className="capitalize text-slate-500">
                      {row.billingCycle}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {row.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {formatDate(row.expiresAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
