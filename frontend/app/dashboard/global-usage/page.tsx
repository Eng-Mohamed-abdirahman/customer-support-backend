"use client"

import { AlertCircle, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listOrganizationsUsage } from "@/services/company.service"
import type { GlobalOrganizationUsageRow } from "@/types/company"

const formatNumber = (value: number) => value.toLocaleString()

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function GlobalUsagePage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<GlobalOrganizationUsageRow[]>([])

  const loadUsage = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    setLoadError(null)

    try {
      const rows = await listOrganizationsUsage()
      setOrganizations(rows)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load global usage."
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

  const totalOrganizations = organizations.length
  const totalTokens = useMemo(
    () => organizations.reduce((sum, row) => sum + (row.usage?.totalTokensUsed ?? 0), 0),
    [organizations]
  )
  const totalMonthlyLimit = useMemo(
    () => organizations.reduce((sum, row) => sum + (row.usage?.monthlyLimit ?? 0), 0),
    [organizations]
  )

  const averageUsagePercent = useMemo(() => {
    if (!organizations.length) {
      return 0
    }

    const percentages = organizations.map((row) => {
      const used = row.usage?.totalTokensUsed ?? 0
      const limit = row.usage?.monthlyLimit ?? 0
      if (limit <= 0) {
        return 0
      }
      return Math.min(100, Math.round((used / limit) * 100))
    })

    const sum = percentages.reduce((acc, value) => acc + value, 0)

    return Math.round(sum / percentages.length)
  }, [organizations])

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Platform / Analytics
            </p>
            <h1 className="mt-1 text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">
              Global usage
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review usage across all organizations and watch for plan overages.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 gap-2"
            onClick={() => void loadUsage(true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
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
          : [
              {
                label: "Organizations",
                value: formatNumber(totalOrganizations),
                helper: "Active tenants on the platform.",
              },
              {
                label: "Total tokens used",
                value: formatNumber(totalTokens),
                helper: "Sum of all organization usage.",
              },
              {
                label: "Average usage",
                value: `${averageUsagePercent}%`,
                helper: "Average usage vs. monthly caps.",
              },
            ].map((metric) => (
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

      <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">Organization usage</CardTitle>
          <CardDescription>
            Track token consumption, limits, and status per organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-6"
                >
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">
              No organizations found yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Limit</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((row) => {
                  const used = row.usage?.totalTokensUsed ?? 0
                  const limit = row.usage?.monthlyLimit ?? 0
                  const percent =
                    limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
                  const planLabel = row.organization.plan
                    ? row.organization.plan.toUpperCase()
                    : "FREE"

                  return (
                    <TableRow key={row.organization._id}>
                      <TableCell className="font-medium text-foreground">
                        {row.organization.name}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {row.organization.status}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{planLabel}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatNumber(used)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {limit > 0 ? formatNumber(limit) : "Unlimited"}
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1">
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {limit > 0 ? `${percent}% used` : "No limit"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isLoading && totalMonthlyLimit > 0 ? (
        <p className="text-xs text-muted-foreground">
          Combined monthly limits: {formatNumber(totalMonthlyLimit)} tokens.
        </p>
      ) : null}
    </div>
  )
}
