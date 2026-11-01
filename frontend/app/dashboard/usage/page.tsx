"use client"

import { AlertCircle, Gauge, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyCompanyUsage } from "@/services/company.service"
import type { MyCompanyUsageResult } from "@/types/company"

const formatNumber = (value: number) => value.toLocaleString()

const formatTimestamp = (value: Date | null) => {
  if (!value) {
    return "-"
  }

  return value.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function UsagePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [usageData, setUsageData] = useState<MyCompanyUsageResult | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const loadUsage = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const response = await getMyCompanyUsage()
      setUsageData(response)
      setLastUpdatedAt(new Date())
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load usage."
      setLoadError(message)
    } finally {
      if (refresh) {
        setIsRefreshing(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadUsage(false)
  }, [loadUsage])

  const usage = usageData?.usage
  const organization = usageData?.organization
  const totalUsed = usage?.totalTokensUsed ?? 0
  const monthlyLimit = usage?.monthlyLimit ?? 0
  const hasLimit = monthlyLimit > 0
  const percentUsed = hasLimit ? Math.min(100, Math.round((totalUsed / monthlyLimit) * 100)) : 0
  const remainingTokens = hasLimit ? Math.max(0, monthlyLimit - totalUsed) : 0
  const isNearLimit = hasLimit && percentUsed >= 80

  const limitLabel = hasLimit ? formatNumber(monthlyLimit) : "Unlimited"
  const remainingLabel = hasLimit ? formatNumber(remainingTokens) : "Unlimited"

  const statusLabel = organization?.status ? organization.status.replace("_", " ") : "-"
  const planLabel = organization?.plan ? organization.plan.toUpperCase() : "FREE"

  const metricCards = useMemo(
    () => [
      {
        label: "Total tokens used",
        value: formatNumber(totalUsed),
        helper: "Lifetime tokens processed for AI responses.",
      },
      {
        label: "Monthly limit",
        value: limitLabel,
        helper: hasLimit
          ? "Resets when the monthly plan limit is updated."
          : "Your workspace has no enforced token cap.",
      },
      {
        label: "Remaining this period",
        value: remainingLabel,
        helper: hasLimit
          ? "Available tokens before the cap is reached."
          : "Unlimited usage available.",
      },
    ],
    [hasLimit, limitLabel, remainingLabel, totalUsed]
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Usage
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Usage
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Monitor token consumption and keep your workspace within plan limits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsage(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load usage</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {isNearLimit ? (
        <Alert>
          <Gauge className="size-4 text-primary" />
          <AlertTitle>Usage nearing limit</AlertTitle>
          <AlertDescription>
            {percentUsed}% of your monthly allowance has been consumed. Consider monitoring high-volume
            channels or upgrading your plan.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        {isLoading
          ? [0, 1, 2].map((index) => (
              <Card key={index} className="border-border/70 bg-card/95 py-4">
                <CardHeader className="gap-2 px-4 pb-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-20" />
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))
          : metricCards.map((metric) => (
              <Card key={metric.label} className="border-border/70 bg-card/95 py-4">
                <CardHeader className="gap-2 px-4 pb-0">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    {metric.value}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pt-0">
                  <p className="text-xs text-muted-foreground">{metric.helper}</p>
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Usage overview</CardTitle>
            <CardDescription>
              Track overall consumption and make sure you stay within your quota.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tokens used</span>
                  <span className="font-medium text-foreground">
                    {formatNumber(totalUsed)} / {limitLabel}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{hasLimit ? `${percentUsed}% of limit used` : "No usage limit"}</span>
                  <span>{hasLimit ? `${remainingLabel} tokens remaining` : "Unlimited"}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Workspace details</CardTitle>
            <CardDescription>Current plan and organization status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="text-sm font-medium text-foreground">{organization?.name ?? "-"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="text-sm font-semibold text-foreground">{planLabel}</p>
                  </div>
                  <span className="rounded-full border border-border/70 bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {statusLabel}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatTimestamp(lastUpdatedAt)}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
