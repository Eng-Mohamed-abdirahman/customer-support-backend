"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { WhatsAppConnectionPanel } from "@/components/dashboard/whatsapp-connection-panel"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getOrganizationAdminSettings,
  updateOrganizationAdminSettings,
} from "@/services/company.service"
import type { SafeUser } from "@/types/auth"
import type {
  OrganizationAdminSettingsResult,
  OrganizationStatus,
  UpdateOrganizationAdminSettingsInput,
} from "@/types/company"

const STATUS_OPTIONS: OrganizationStatus[] = ["trialing", "active", "suspended", "cancelled"]

const mapSettingsToUpdateInput = (
  organization: OrganizationAdminSettingsResult["organization"]
): UpdateOrganizationAdminSettingsInput => {
  return {
    status: organization.status,
    aiSettings: {
      aiEnabled: organization.aiSettings.aiEnabled,
      autoReplyEnabled: organization.aiSettings.autoReplyEnabled,
      humanHandoffEnabled: organization.aiSettings.humanHandoffEnabled,
      modelName: organization.aiSettings.modelName,
    },
    allowedChannels: organization.allowedChannels,
    apiSettings: {
      keyPrefix: organization.apiSettings.keyPrefix,
      totalTokensUsed: organization.apiSettings.totalTokensUsed,
      monthlyLimit: organization.apiSettings.monthlyLimit,
    },
    subscription: {
      plan: organization.subscription.plan,
      stripeCustomerId: organization.subscription.stripeCustomerId,
    },
  }
}

const parseNonNegativeInt = (value: string, fallback = 0): number => {
  const parsed = Number.parseInt(value, 10)

  if (Number.isNaN(parsed)) {
    return fallback
  }

  return Math.max(0, parsed)
}

export default function OrganizationAdminSettingsPage() {
  const params = useParams<{ organizationId: string }>()
  const organizationId =
    typeof params.organizationId === "string" ? params.organizationId : ""

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [organization, setOrganization] =
    useState<OrganizationAdminSettingsResult["organization"] | null>(null)
  const [formData, setFormData] = useState<UpdateOrganizationAdminSettingsInput | null>(null)
  const [allowedChannelsInput, setAllowedChannelsInput] = useState("website")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const loadSettings = useCallback(
    async (refresh = false) => {
      if (!organizationId) {
        setLoadError("Organization id is missing from this route.")
        setIsLoading(false)
        return
      }

      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setLoadError(null)

      try {
        const response = await getOrganizationAdminSettings(organizationId)
        const mapped = mapSettingsToUpdateInput(response.organization)

        setOrganization(response.organization)
        setFormData(mapped)
        setAllowedChannelsInput(mapped.allowedChannels.join(", "))
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load organization settings."

        setLoadError(message)
      } finally {
        if (refresh) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [organizationId]
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const rawUser = localStorage.getItem("user")

    if (!rawUser) {
      return
    }

    try {
      const parsed = JSON.parse(rawUser) as SafeUser
      setIsSuperAdmin(parsed.platformRole === "super_admin")
    } catch {
      setIsSuperAdmin(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings(false)
  }, [loadSettings])

  const updateAiField = <K extends keyof UpdateOrganizationAdminSettingsInput["aiSettings"]>(
    field: K,
    value: UpdateOrganizationAdminSettingsInput["aiSettings"][K]
  ) => {
    setFormData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        aiSettings: {
          ...previous.aiSettings,
          [field]: value,
        },
      }
    })
  }

  const updateApiField = <K extends keyof UpdateOrganizationAdminSettingsInput["apiSettings"]>(
    field: K,
    value: UpdateOrganizationAdminSettingsInput["apiSettings"][K]
  ) => {
    setFormData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        apiSettings: {
          ...previous.apiSettings,
          [field]: value,
        },
      }
    })
  }

  const updateSubscriptionField = <
    K extends keyof UpdateOrganizationAdminSettingsInput["subscription"],
  >(
    field: K,
    value: UpdateOrganizationAdminSettingsInput["subscription"][K]
  ) => {
    setFormData((previous) => {
      if (!previous) {
        return previous
      }

      return {
        ...previous,
        subscription: {
          ...previous.subscription,
          [field]: value,
        },
      }
    })
  }

  const handleSave = async () => {
    if (!organizationId || !formData) {
      return
    }

    if (!isSuperAdmin) {
      toast.error("Only super admins can update organization admin settings.")
      return
    }

    const channels = allowedChannelsInput
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (channels.length === 0) {
      toast.error("Provide at least one allowed channel.")
      return
    }

    const payload: UpdateOrganizationAdminSettingsInput = {
      ...formData,
      status: formData.status,
      aiSettings: {
        ...formData.aiSettings,
        modelName: formData.aiSettings.modelName.trim(),
      },
      allowedChannels: channels,
      apiSettings: {
        keyPrefix: formData.apiSettings.keyPrefix.trim(),
        totalTokensUsed: Math.max(0, Math.trunc(formData.apiSettings.totalTokensUsed)),
        monthlyLimit: Math.max(0, Math.trunc(formData.apiSettings.monthlyLimit)),
      },
      subscription: {
        plan: formData.subscription.plan.trim(),
        stripeCustomerId: formData.subscription.stripeCustomerId.trim(),
      },
    }

    try {
      setIsSaving(true)

      const response = await updateOrganizationAdminSettings(organizationId, payload)
      const mapped = mapSettingsToUpdateInput(response.organization)

      setOrganization(response.organization)
      setFormData(mapped)
      setAllowedChannelsInput(mapped.allowedChannels.join(", "))

      toast.success("Organization admin settings updated.")
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update organization settings."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const isFormDisabled = isLoading || isSaving || !formData || !isSuperAdmin

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Platform / Organization
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              Organization Admin Settings
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage system-level fields for this organization. These settings are editable by
              super admins only.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2"
            onClick={() => void loadSettings(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {!isSuperAdmin ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Only super admins can save changes on this page.
          </AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load organization settings</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="border-border/70 bg-card/95 py-4">
              <CardHeader className="gap-2 px-4 pb-0">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </CardHeader>
            </Card>
          ))}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Company name</CardDescription>
              <CardTitle className="text-lg font-semibold tracking-tight">
                {organization?.name ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Workspace slug</CardDescription>
              <CardTitle className="text-lg font-semibold tracking-tight">
                {organization?.slug ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card/95 py-4">
            <CardHeader className="gap-2 px-4 pb-1">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-lg font-semibold uppercase tracking-tight">
                {organization?.status ?? "-"}
              </CardTitle>
            </CardHeader>
          </Card>
        </section>
      )}

      <Card className="border-border/70 bg-card/95 py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base">System-admin fields</CardTitle>
          <CardDescription>
            Edit status, AI behavior, channel restrictions, API usage controls, and subscription.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pb-5">
          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Organization status</p>
            <div className="space-y-2">
              <Label htmlFor="organizationStatus">Status</Label>
              <select
                id="organizationStatus"
                value={formData?.status ?? "trialing"}
                onChange={(event) => {
                  const nextStatus = event.target.value as OrganizationStatus
                  setFormData((previous) =>
                    previous
                      ? {
                          ...previous,
                          status: nextStatus,
                        }
                      : previous
                  )
                }}
                disabled={isFormDisabled}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">AI settings</p>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={Boolean(formData?.aiSettings.aiEnabled)}
                  onCheckedChange={(checked) => updateAiField("aiEnabled", checked === true)}
                  disabled={isFormDisabled}
                />
                AI enabled
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={Boolean(formData?.aiSettings.autoReplyEnabled)}
                  onCheckedChange={(checked) =>
                    updateAiField("autoReplyEnabled", checked === true)
                  }
                  disabled={isFormDisabled}
                />
                Auto reply enabled
              </label>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={Boolean(formData?.aiSettings.humanHandoffEnabled)}
                  onCheckedChange={(checked) =>
                    updateAiField("humanHandoffEnabled", checked === true)
                  }
                  disabled={isFormDisabled}
                />
                Human handoff enabled
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiModelName">Model name</Label>
              <Input
                id="aiModelName"
                value={formData?.aiSettings.modelName ?? ""}
                onChange={(event) => updateAiField("modelName", event.target.value)}
                disabled={isFormDisabled}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Allowed channels</p>
            <div className="space-y-2">
              <Label htmlFor="allowedChannels">Channels</Label>
              <Input
                id="allowedChannels"
                value={allowedChannelsInput}
                onChange={(event) => setAllowedChannelsInput(event.target.value)}
                disabled={isFormDisabled}
                placeholder="website, whatsapp"
              />
              <p className="text-xs text-muted-foreground">
                Separate channel names with commas.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">API settings</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apiKeyPrefix">Key prefix</Label>
                <Input
                  id="apiKeyPrefix"
                  value={formData?.apiSettings.keyPrefix ?? ""}
                  onChange={(event) => updateApiField("keyPrefix", event.target.value)}
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiMonthlyLimit">Monthly limit</Label>
                <Input
                  id="apiMonthlyLimit"
                  type="number"
                  min={0}
                  value={formData?.apiSettings.monthlyLimit ?? 0}
                  onChange={(event) =>
                    updateApiField(
                      "monthlyLimit",
                      parseNonNegativeInt(event.target.value, formData?.apiSettings.monthlyLimit ?? 0)
                    )
                  }
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="apiTotalTokens">Total tokens used</Label>
                <Input
                  id="apiTotalTokens"
                  type="number"
                  min={0}
                  value={formData?.apiSettings.totalTokensUsed ?? 0}
                  onChange={(event) =>
                    updateApiField(
                      "totalTokensUsed",
                      parseNonNegativeInt(
                        event.target.value,
                        formData?.apiSettings.totalTokensUsed ?? 0
                      )
                    )
                  }
                  disabled={isFormDisabled}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">Subscription</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Plan</Label>
                <Input
                  id="subscriptionPlan"
                  value={formData?.subscription.plan ?? ""}
                  onChange={(event) => updateSubscriptionField("plan", event.target.value)}
                  disabled={isFormDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripeCustomerId">Stripe customer id</Label>
                <Input
                  id="stripeCustomerId"
                  value={formData?.subscription.stripeCustomerId ?? ""}
                  onChange={(event) =>
                    updateSubscriptionField("stripeCustomerId", event.target.value)
                  }
                  disabled={isFormDisabled}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={isFormDisabled}>
              {isSaving ? "Saving..." : "Save admin settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {organizationId && (
        <WhatsAppConnectionPanel organizationId={organizationId} />
      )}
    </div>
  )
}
