"use client"

import {
  AlertCircle,
  ExternalLink,
  Eye,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  createMyCompanyApiKey,
  listMyCompanyApiKeys,
  revealMyCompanyApiKey,
} from "@/services/company.service"
import { getDesignStatus, listDesignHistory } from "@/services/design.service"
import type { DesignHistoryRecord, DesignType } from "@/types/design"

const designTypeLabels: Record<DesignType, string> = {
  poster: "Poster",
  flyer: "Flyer",
  brochure: "Brochure",
  social_media_post: "Social Media",
  banner: "Banner",
}

const statusBadgeClass: Record<DesignHistoryRecord["status"], string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  failed: "bg-destructive/10 text-destructive",
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function truncateText(value: string, max = 80) {
  if (value.length <= max) return value
  return `${value.slice(0, max).trim()}…`
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 px-3 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">{value}</span>
    </div>
  )
}

export default function DesignHistoryPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isApiKeyLoading, setIsApiKeyLoading] = useState(true)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)

  const [designs, setDesigns] = useState<DesignHistoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selectedDesign, setSelectedDesign] = useState<DesignHistoryRecord | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const limit = 20
  const totalPages = Math.max(1, Math.ceil(total / limit))

  useEffect(() => {
    async function resolveApiKey() {
      setIsApiKeyLoading(true)
      setApiKeyError(null)

      try {
        const storedKey = localStorage.getItem("studio-api-key")
        if (storedKey) {
          setApiKey(storedKey)
          return
        }

        const response = await listMyCompanyApiKeys()
        const activeKey = response.apiKeys.find((k) => !k.revokedAt)

        if (activeKey) {
          const revealed = await revealMyCompanyApiKey(activeKey.id)
          setApiKey(revealed.apiKey)
          localStorage.setItem("studio-api-key", revealed.apiKey)
        } else {
          const created = await createMyCompanyApiKey({ name: "Studio Canvas Auto Key" })
          setApiKey(created.apiKey)
          localStorage.setItem("studio-api-key", created.apiKey)
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to authenticate workspace API Key."
        setApiKeyError(message)
      } finally {
        setIsApiKeyLoading(false)
      }
    }

    void resolveApiKey()
  }, [])

  const loadDesigns = useCallback(
    async (refresh = false) => {
      if (!apiKey) return

      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setLoadError(null)

      try {
        const result = await listDesignHistory(apiKey, { page, limit })
        setDesigns(result.designs)
        setTotal(result.total)
        if (refresh) {
          toast.success("Design history refreshed.")
        }
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to load design history."
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [apiKey, page]
  )

  useEffect(() => {
    if (apiKey) {
      void loadDesigns(false)
    }
  }, [apiKey, loadDesigns])

  const stats = useMemo(
    () => ({
      total,
      completed: designs.filter((d) => d.status === "completed").length,
      processing: designs.filter((d) => d.status === "processing" || d.status === "pending").length,
      failed: designs.filter((d) => d.status === "failed").length,
    }),
    [designs, total]
  )

  const handleOpenDesign = async (designId: string) => {
    if (!apiKey) return

    setIsDetailLoading(true)
    setDetailError(null)
    setSelectedDesign(null)

    try {
      const detail = await getDesignStatus(designId, apiKey)
      setSelectedDesign(detail)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load design details."
      setDetailError(message)
      toast.error(message)
    } finally {
      setIsDetailLoading(false)
    }
  }

  if (isApiKeyLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (apiKeyError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Authentication required</AlertTitle>
          <AlertDescription>{apiKeyError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Design History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and inspect all AI-generated designs from your studio workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/studio">
              <Sparkles className="size-4" />
              Open Studio
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isRefreshing}
            onClick={() => void loadDesigns(true)}
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load history</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {detailError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to open design</AlertTitle>
          <AlertDescription>{detailError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total designs", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "In progress", value: stats.processing },
          { label: "Failed", value: stats.failed },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/70 bg-card/95">
            <CardContent className="px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-border/70 bg-card/95 py-0">
        <CardHeader className="border-b border-border/60 py-4">
          <CardTitle className="text-base">All designs</CardTitle>
          <CardDescription>Click any row to view full design details.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : designs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ImageIcon className="mx-auto size-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium text-foreground">No designs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Generate your first design in the Studio Canvas.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/dashboard/studio">
                  <Sparkles className="size-4" />
                  Go to Studio
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/45">
                    {["Preview", "Type", "Prompt", "Status", "Reference", "Created", ""].map(
                      (heading) => (
                        <th
                          key={heading || "actions"}
                          className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {designs.map((design) => (
                    <tr
                      key={design._id}
                      className="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30"
                      onClick={() => void handleOpenDesign(design._id)}
                    >
                      <td className="px-4 py-3">
                        <div className="relative size-14 overflow-hidden rounded-md border border-border/60 bg-muted">
                          {design.generatedImageUrl ? (
                            <Image
                              src={design.generatedImageUrl}
                              alt="Generated design"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <ImageIcon className="size-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {designTypeLabels[design.designType] ?? design.designType}
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {truncateText(design.promptText, 100)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                            statusBadgeClass[design.status]
                          )}
                        >
                          {design.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {design.usedReferenceImage ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(design.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="View details"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleOpenDesign(design._id)
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(selectedDesign) || isDetailLoading}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDesign(null)
            setDetailError(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Design details</DialogTitle>
            <DialogDescription>Full information for this generated design.</DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedDesign ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Generated output
                  </p>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border/60 bg-muted">
                    {selectedDesign.generatedImageUrl ? (
                      <Image
                        src={selectedDesign.generatedImageUrl}
                        alt="Generated design"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                        No image yet
                      </div>
                    )}
                  </div>
                  {selectedDesign.generatedImageUrl ? (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a
                        href={selectedDesign.generatedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-4" />
                        Open full image
                      </a>
                    </Button>
                  ) : null}
                </div>

                {selectedDesign.referenceImageUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Reference image
                    </p>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border/60 bg-muted">
                      <Image
                        src={selectedDesign.referenceImageUrl}
                        alt="Reference design"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2 text-sm">
                <DetailRow
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={cn("uppercase", statusBadgeClass[selectedDesign.status])}
                    >
                      {selectedDesign.status}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Design type"
                  value={designTypeLabels[selectedDesign.designType] ?? selectedDesign.designType}
                />
                <DetailRow label="Design ID" value={selectedDesign._id} />
                <DetailRow label="Created" value={formatDate(selectedDesign.createdAt)} />
                <DetailRow label="Updated" value={formatDate(selectedDesign.updatedAt)} />
                <DetailRow
                  label="Used reference"
                  value={selectedDesign.usedReferenceImage ? "Yes" : "No"}
                />
                <DetailRow
                  label="Generation model"
                  value={selectedDesign.generationModel ?? "-"}
                />
                <DetailRow
                  label="Replicate prediction"
                  value={selectedDesign.replicatePredictionId ?? "-"}
                />
              </div>

              {selectedDesign.rawUserIntention ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Original intention
                  </p>
                  <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground">
                    {selectedDesign.rawUserIntention}
                  </p>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Optimized prompt
                </p>
                <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                  {selectedDesign.promptText}
                </p>
              </div>

              {selectedDesign.compiledPrompt ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Compiled generation prompt
                  </p>
                  <p className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
                    {selectedDesign.compiledPrompt}
                  </p>
                </div>
              ) : null}

              {selectedDesign.brandSnapshot ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Brand snapshot
                  </p>
                  <div className="grid gap-2">
                    <DetailRow label="Brand name" value={selectedDesign.brandSnapshot.brandName} />
                    <DetailRow
                      label="Colors"
                      value={
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-4 rounded-full border border-border/60"
                            style={{ backgroundColor: selectedDesign.brandSnapshot.primaryColor }}
                          />
                          <span
                            className="inline-block size-4 rounded-full border border-border/60"
                            style={{ backgroundColor: selectedDesign.brandSnapshot.secondaryColor }}
                          />
                          <span>{selectedDesign.brandSnapshot.fontStyle}</span>
                        </span>
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedDesign.layoutAnalysis ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Layout analysis
                  </p>
                  <div className="grid gap-2">
                    {(
                      [
                        ["Layout", selectedDesign.layoutAnalysis.layoutStructure],
                        ["Hierarchy", selectedDesign.layoutAnalysis.visualHierarchy],
                        ["CTA", selectedDesign.layoutAnalysis.ctaPlacement],
                        ["Content blocks", selectedDesign.layoutAnalysis.contentBlocks],
                        ["Image placement", selectedDesign.layoutAnalysis.imagePlacement],
                        ["Colors", selectedDesign.layoutAnalysis.colorDistribution],
                        ["Typography", selectedDesign.layoutAnalysis.typographyHierarchy],
                        ["Decorative", selectedDesign.layoutAnalysis.decorativeElements],
                      ] as const
                    ).map(([label, value]) => (
                      <DetailRow key={label} label={label} value={value || "-"} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
