"use client"

import {
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { AssignPlanDialog } from "@/components/dashboard/plans/assign-plan-dialog"
import { OrganizationsPlanTable } from "@/components/dashboard/plans/organizations-plan-table"
import { PlanCard } from "@/components/dashboard/plans/plan-card"
import { PlanFormDialog } from "@/components/dashboard/plans/plan-form-dialog"
import { PlanStatsRow } from "@/components/dashboard/plans/plan-stats-row"
import { SubscribersSheet } from "@/components/dashboard/plans/subscribers-sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  assignPlanToOrganization,
  changeOrganizationPlan,
  createPlan,
  deletePlan,
  duplicatePlan,
  getPlanDashboardStats,
  getPlanOrganizations,
  listPlans,
  removePlanFromOrganization,
  updatePlan,
  updatePlanStatus,
} from "@/services/plan.service"
import type {
  BillingCycle,
  CreatePlanInput,
  OrganizationSubscriptionRow,
  PlanDashboardStats,
  SubscriptionPlan,
} from "@/types/plan"

const STARTER_SEED: CreatePlanInput = {
  name: "Starter",
  description: "For small teams getting started with AI support.",
  monthlyPrice: 50,
  yearlyPrice: 500,
  maxWebsites: 1,
  maxWhatsappNumbers: 1,
  maxTeamMembers: 5,
  maxConversations: 2000,
  knowledgeStorageGb: 2,
  analyticsEnabled: true,
  knowledgeAiEnabled: true,
}

const PROFESSIONAL_SEED: CreatePlanInput = {
  name: "Professional",
  description: "Everything growing teams need to automate support.",
  monthlyPrice: 100,
  yearlyPrice: 1000,
  maxWebsites: 2,
  maxWhatsappNumbers: 2,
  maxTeamMembers: 10,
  maxConversations: 4000,
  knowledgeStorageGb: 8,
  analyticsEnabled: true,
  knowledgeAiEnabled: true,
  conversationSummaryEnabled: true,
  faqInsightsEnabled: true,
  sentimentAnalysisEnabled: true,
}

const ENTERPRISE_SEED: CreatePlanInput = {
  name: "Enterprise",
  description: "Custom enterprise-grade support automation.",
  monthlyPrice: 0,
  yearlyPrice: 0,
  maxWebsites: 999999,
  maxWhatsappNumbers: 999999,
  maxTeamMembers: 999999,
  maxConversations: 999999,
  knowledgeStorageGb: 999999,
  analyticsEnabled: true,
  knowledgeAiEnabled: true,
  conversationSummaryEnabled: true,
  faqInsightsEnabled: true,
  sentimentAnalysisEnabled: true,
  prioritySupport: true,
  advancedSecurity: true,
  whiteLabel: true,
  customBranding: true,
  dedicatedManager: true,
  apiAccess: true,
}

export function PlanManagementPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [planCounts, setPlanCounts] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<PlanDashboardStats | null>(null)
  const [orgRows, setOrgRows] = useState<OrganizationSubscriptionRow[]>([])
  const [search, setSearch] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [isSavingPlan, setIsSavingPlan] = useState(false)

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignPlan, setAssignPlan] = useState<SubscriptionPlan | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const [subscribersOpen, setSubscribersOpen] = useState(false)
  const [subscribersPlan, setSubscribersPlan] = useState<SubscriptionPlan | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionPlan | null>(null)

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)

    setLoadError(null)

    try {
      const [plansResult, statsResult] = await Promise.all([
        listPlans({ limit: 50, search: search || undefined }),
        getPlanDashboardStats(),
      ])

      const nextPlans = plansResult.plans
      setPlans(nextPlans)
      setStats(statsResult)

      const counts: Record<string, number> = {}
      const orgMap = new Map<string, OrganizationSubscriptionRow>()

      await Promise.all(
        nextPlans.map(async (plan) => {
          const result = await getPlanOrganizations(plan.id, { limit: 100 })
          counts[plan.id] = result.pagination.total

          result.organizations.forEach((org) => {
            orgMap.set(org.organizationId, {
              organizationId: org.organizationId,
              organizationName: org.organizationName,
              planId: plan.id,
              planName: plan.name,
              billingCycle: org.billingCycle,
              subscriptionStatus: org.subscriptionStatus,
              expiresAt: org.expiresAt,
              conversationsUsed: org.usage.conversationsUsed,
              storageUsedGb: org.usage.storageUsedGb,
              assignedBy: "Platform Admin",
            })
          })
        })
      )

      setPlanCounts(counts)
      setOrgRows(Array.from(orgMap.values()))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load plan management data"
      setLoadError(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [search])

  useEffect(() => {
    void loadData(false)
  }, [loadData])

  const filteredPlans = useMemo(() => {
    if (!search.trim()) return plans
    const query = search.trim().toLowerCase()
    return plans.filter(
      (plan) =>
        plan.name.toLowerCase().includes(query) ||
        plan.description.toLowerCase().includes(query)
    )
  }, [plans, search])

  const openCreate = () => {
    setEditingPlan(null)
    setFormOpen(true)
  }

  const openEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setFormOpen(true)
  }

  const handleSavePlan = async (values: CreatePlanInput) => {
    setIsSavingPlan(true)
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, values)
        toast.success("Plan updated successfully")
      } else {
        await createPlan(values)
        toast.success("Plan created successfully")
      }
      setFormOpen(false)
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to save plan")
    } finally {
      setIsSavingPlan(false)
    }
  }

  const handleSeedDefaults = async () => {
    setBusyPlanId("seed")
    try {
      const existing = await listPlans({ limit: 50 })
      const names = new Set(existing.plans.map((plan) => plan.name.toLowerCase()))

      const seeds = [STARTER_SEED, PROFESSIONAL_SEED, ENTERPRISE_SEED].filter(
        (seed) => !names.has(seed.name.toLowerCase())
      )

      for (const seed of seeds) {
        await createPlan(seed)
      }

      toast.success(
        seeds.length > 0
          ? "Default plans created successfully"
          : "Starter, Professional, and Enterprise plans already exist"
      )
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to seed default plans")
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleDuplicate = async (plan: SubscriptionPlan) => {
    setBusyPlanId(plan.id)
    try {
      await duplicatePlan(plan.id)
      toast.success("Plan duplicated successfully")
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate plan")
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    setBusyPlanId(plan.id)
    try {
      const nextStatus = plan.status === "active" ? "disabled" : "active"
      await updatePlanStatus(plan.id, nextStatus)
      toast.success(`Plan ${nextStatus === "active" ? "enabled" : "disabled"} successfully`)
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan status")
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setBusyPlanId(deleteTarget.id)
    try {
      await deletePlan(deleteTarget.id)
      toast.success("Plan deleted successfully")
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete plan")
    } finally {
      setBusyPlanId(null)
    }
  }

  const handleAssign = async (organizationId: string, billingCycle: BillingCycle) => {
    if (!assignPlan) return

    setIsAssigning(true)
    try {
      try {
        await assignPlanToOrganization(organizationId, {
          planId: assignPlan.id,
          billingCycle,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message.toLowerCase() : ""
        if (
          message.includes("change-plan") ||
          message.includes("already has a plan")
        ) {
          await changeOrganizationPlan(organizationId, {
            planId: assignPlan.id,
            billingCycle,
          })
        } else {
          throw error
        }
      }

      toast.success("Plan assigned successfully")
      setAssignOpen(false)
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to assign plan")
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveOrganizationPlan = async (row: OrganizationSubscriptionRow) => {
    try {
      await removePlanFromOrganization(row.organizationId)
      toast.success("Plan removed from organization")
      await loadData(true)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to remove plan")
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Platform / Billing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Plan Management
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Manage all subscription plans available for organizations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            onClick={() => void loadData(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-200 bg-white"
            asChild
          >
            <Link href="/dashboard/platform-settings">
              <Settings className="size-4" />
              Settings
            </Link>
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-primary px-4 text-white hover:opacity-90"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            Create Plan
          </Button>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load plans</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <PlanStatsRow stats={stats} isLoading={isLoading} />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Subscription Plans</h2>
            <p className="text-sm text-slate-500">
              Create, edit, and assign plans that organizations can subscribe to.
            </p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search plans..."
                className="h-10 rounded-xl border-slate-200 bg-white pl-9"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-5 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-[520px] rounded-2xl" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">No plans yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Create your first subscription plan or load the default Starter,
              Professional, and Enterprise tiers.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => void handleSeedDefaults()}
                disabled={busyPlanId === "seed"}
              >
                Load Default Plans
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-primary text-white"
                onClick={openCreate}
              >
                Create Plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-3">
            {filteredPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                assignedCount={planCounts[plan.id] ?? 0}
                stats={stats}
                isBusy={busyPlanId === plan.id}
                onEdit={openEdit}
                onDelete={(target) => {
                  setDeleteTarget(target)
                  setDeleteOpen(true)
                }}
                onDuplicate={handleDuplicate}
                onAssign={(target) => {
                  setAssignPlan(target)
                  setAssignOpen(true)
                }}
                onViewSubscribers={(target) => {
                  setSubscribersPlan(target)
                  setSubscribersOpen(true)
                }}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>
        )}
      </section>

      <OrganizationsPlanTable
        rows={orgRows}
        isLoading={isLoading}
        onRemovePlan={(row) => void handleRemoveOrganizationPlan(row)}
        onChangePlan={(row) => {
          const plan = plans.find((item) => item.id === row.planId)
          if (plan) {
            setAssignPlan(plan)
            setAssignOpen(true)
          }
        }}
      />

      <PlanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        plan={editingPlan}
        isSubmitting={isSavingPlan}
        onSubmit={handleSavePlan}
      />

      <AssignPlanDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        plan={assignPlan}
        isSubmitting={isAssigning}
        onSubmit={handleAssign}
      />

      <SubscribersSheet
        open={subscribersOpen}
        onOpenChange={setSubscribersOpen}
        plan={subscribersPlan}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete plan</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-slate-900">{deleteTarget?.name}</span>. Plans
              assigned to organizations cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={busyPlanId === deleteTarget?.id}
            >
              Delete Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
