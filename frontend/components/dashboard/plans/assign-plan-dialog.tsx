"use client"

import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listOrganizations } from "@/services/company.service"
import type { BillingCycle, SubscriptionPlan } from "@/types/plan"
import type { OrganizationWithUsers } from "@/types/company"

type AssignPlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: SubscriptionPlan | null
  isSubmitting?: boolean
  onSubmit: (organizationId: string, billingCycle: BillingCycle) => Promise<void>
}

export function AssignPlanDialog({
  open,
  onOpenChange,
  plan,
  isSubmitting = false,
  onSubmit,
}: AssignPlanDialogProps) {
  const [organizationId, setOrganizationId] = useState("")
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")

  // Start from a clean form every time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setOrganizationId("")
      setBillingCycle("monthly")
    }
  }

  const organizationsQuery = useQuery<OrganizationWithUsers[], Error>({
    queryKey: ["organizations"],
    queryFn: listOrganizations,
    enabled: open,
  })
  const organizations = organizationsQuery.data ?? []
  const isLoadingOrgs = organizationsQuery.isFetching

  useEffect(() => {
    if (organizationsQuery.error) {
      toast.error(organizationsQuery.error.message || "Failed to load organizations")
    }
  }, [organizationsQuery.error])

  const handleSubmit = async () => {
    if (!organizationId) {
      toast.error("Please select an organization")
      return
    }

    await onSubmit(organizationId, billingCycle)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Plan</DialogTitle>
          <DialogDescription>
            Assign <span className="font-medium text-slate-900">{plan?.name}</span> to an
            organization and choose a billing cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select
              value={organizationId}
              onValueChange={setOrganizationId}
              disabled={isLoadingOrgs || isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={isLoadingOrgs ? "Loading organizations..." : "Select organization"}
                />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Billing Cycle</Label>
            <Select
              value={billingCycle}
              onValueChange={(value) => setBillingCycle(value as BillingCycle)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary text-white hover:opacity-90"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isLoadingOrgs}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
