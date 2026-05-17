"use client"

import { AlertCircle, Loader2, Ticket } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { listTickets } from "@/services/ticket.service"
import type { TicketRecord, TicketStatus } from "@/types/ticket"

const statusFilters: Array<TicketStatus | "all"> = ["all", "open", "pending", "closed"]

const formatDateTime = (value?: string) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const getStatusTone = (status: TicketStatus) => {
  switch (status) {
    case "open":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
    case "pending":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30"
    case "closed":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30"
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/30"
  }
}

export default function TicketsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all")

  const loadTickets = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setLoadError(null)

      try {
        const result = await listTickets({
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 50,
        })
        setTickets(result.tickets)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load tickets"
        setLoadError(message)
      } finally {
        if (refresh) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [statusFilter]
  )

  useEffect(() => {
    void loadTickets(false)
  }, [loadTickets])

  const ticketCountLabel = useMemo(() => `${tickets.length} tickets`, [tickets.length])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Workspace / Tickets
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Tickets</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review human handoff requests created from live conversations.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2"
          onClick={() => void loadTickets(true)}
          disabled={isLoading || isRefreshing}
        >
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
          Refresh
        </Button>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load tickets</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/70 bg-card/95">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Ticket Inbox</CardTitle>
            <span className="text-xs text-muted-foreground">{ticketCountLabel}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((status) => (
              <Button
                key={status}
                type="button"
                variant={statusFilter === status ? "default" : "outline"}
                className="h-8 px-3 text-xs"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Alert>
              <AlertTitle>No tickets yet</AlertTitle>
              <AlertDescription>
                Human handoff requests will appear here when they are created from conversations.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket._id}
                  className="rounded-2xl border border-border/70 bg-card/90 p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.customerName || ticket.customerPhone || "Unknown customer"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        getStatusTone(ticket.status)
                      )}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDateTime(ticket.createdAt)}</span>
                    <span>Conversation {ticket.conversationId.slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
