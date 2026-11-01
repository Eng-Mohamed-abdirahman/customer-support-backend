"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { TicketRecord } from "@/types/ticket"

import {
  formatDateTime,
  formatSessionId,
  getStatusTone,
  isValidConversationId,
  statusFilters,
  type TicketStatusFilter,
} from "./ticket-utils"

type TicketListProps = {
  isLoading: boolean
  tickets: TicketRecord[]
  ticketCountLabel: string
  statusFilter: TicketStatusFilter
  onStatusFilterChange: (status: TicketStatusFilter) => void
  selectedTicketId?: string
  onSelectTicket: (ticket: TicketRecord) => void
}

export function TicketList({
  isLoading,
  tickets,
  ticketCountLabel,
  statusFilter,
  onStatusFilterChange,
  selectedTicketId,
  onSelectTicket,
}: TicketListProps) {
  return (
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
              onClick={() => onStatusFilterChange(status)}
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
            {tickets.map((ticket) => {
              const isActive = selectedTicketId === ticket._id

              return (
                <button
                  key={ticket._id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border border-border/70 bg-card/90 p-4 text-left transition",
                    isActive
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                      : "hover:bg-muted/40"
                  )}
                  onClick={() => onSelectTicket(ticket)}
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
                    <span>
                      {formatSessionId(
                        isValidConversationId(ticket.conversationId)
                          ? ticket.conversationId
                          : null
                      )}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
