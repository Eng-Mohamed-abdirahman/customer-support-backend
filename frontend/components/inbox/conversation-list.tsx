"use client"

import { MessageSquare, Search } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ConversationRecord } from "@/types/conversation"

import { formatTimeAgo, getInitials, statusFilters, type InboxStatusFilter } from "./inbox-utils"

type ConversationListProps = {
  isLoading: boolean
  conversations: ConversationRecord[]
  selectedConversationId?: string
  onSelectConversation: (conversation: ConversationRecord) => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  statusFilter: InboxStatusFilter
  onStatusFilterChange: (value: InboxStatusFilter) => void
}

export function ConversationList({
  isLoading,
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
}: ConversationListProps) {
  return (
    <div className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search conversations..."
            className="h-9 pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as InboxStatusFilter)}
          className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
        >
          {statusFilters.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="size-8 opacity-40" />
            <p>No WhatsApp conversations yet.</p>
            <p className="text-xs max-w-xs">
              If Meta shows messages but this inbox is empty, your webhook callback URL must
              point to a public API (not localhost) and messages must reach your backend.
            </p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/dashboard/integrations">Configure WhatsApp webhook</Link>
            </Button>
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = selectedConversationId === conversation._id
            const name = conversation.customerName || conversation.customerPhone

            return (
              <button
                key={conversation._id}
                type="button"
                onClick={() => onSelectConversation(conversation)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-muted/40",
                  isActive && "bg-primary/5"
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                  {getInitials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatTimeAgo(conversation.lastMessageAt)}
                    </span>
                  </div>
                  {conversation.lastMessageText ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conversation.lastMessageSender !== "customer" ? "You: " : ""}
                      {conversation.lastMessageText}
                    </p>
                  ) : null}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
