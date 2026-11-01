"use client"

import { Loader2, MessageSquareText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ConversationRecord } from "@/types/conversation"
import type { TicketRecord, TicketStatus } from "@/types/ticket"

import {
  formatSessionId,
  getStatusTone,
  isValidConversationId,
  statusFilters,
} from "./ticket-utils"

type TicketDetailHeaderProps = {
  selectedTicket: TicketRecord | null
  selectedConversation: ConversationRecord | null
  onOpenConversation: (ticket: TicketRecord) => void
  onStatusChange: (status: TicketStatus) => void
  statusUpdateLoading: boolean
  onReturnToAi: () => void
  returnToAiLoading: boolean
  onTakeover: () => void
  takeoverLoading: boolean
}

export function TicketDetailHeader({
  selectedTicket,
  selectedConversation,
  onOpenConversation,
  onStatusChange,
  statusUpdateLoading,
  onReturnToAi,
  returnToAiLoading,
  onTakeover,
  takeoverLoading,
}: TicketDetailHeaderProps) {
  return (
    <div className="border-b border-border/60 bg-background/80 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MessageSquareText className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {selectedTicket
                  ? `Ticket ${selectedTicket._id.slice(-6).toUpperCase()}`
                  : "Ticket detail"}
              </h2>
              {selectedTicket ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    getStatusTone(selectedTicket.status)
                  )}
                >
                  {selectedTicket.status}
                </span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedTicket ? (
                <button
                  type="button"
                  onClick={() => onOpenConversation(selectedTicket)}
                  className="hover:underline text-left hover:text-primary transition-colors"
                >
                  Conversation {formatSessionId(
                    isValidConversationId(selectedTicket.conversationId)
                      ? selectedTicket.conversationId
                      : null
                  )} · {selectedTicket.customerName || selectedTicket.customerPhone || "Unknown customer"}
                </button>
              ) : (
                "Select a ticket to see the conversation and details."
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Ticket status"
            value={selectedTicket?.status ?? "open"}
            onChange={(event) => onStatusChange(event.target.value as TicketStatus)}
            disabled={!selectedTicket || statusUpdateLoading}
            className="h-9 rounded-full border border-border/70 bg-background px-3 text-xs font-semibold uppercase"
          >
            {statusFilters.filter((status) => status !== "all").map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button
            type="button"
            className="h-9 rounded-full bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25"
            onClick={onReturnToAi}
            disabled={
              !isValidConversationId(selectedTicket?.conversationId) ||
              selectedConversation?.aiEnabled === true ||
              returnToAiLoading
            }
          >
            {returnToAiLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Return to AI
          </Button>
          <Button
            type="button"
            className="h-9 rounded-full bg-rose-500/15 px-4 text-xs font-semibold text-rose-400 hover:bg-rose-500/25"
            onClick={onTakeover}
            disabled={
              !isValidConversationId(selectedTicket?.conversationId) ||
              selectedConversation?.aiEnabled === false ||
              takeoverLoading
            }
          >
            {takeoverLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            Take Over Chat
          </Button>
        </div>
      </div>
    </div>
  )
}
