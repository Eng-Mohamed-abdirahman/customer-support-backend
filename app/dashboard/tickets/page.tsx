"use client"

import {
  AlertCircle,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Ticket,
} from "lucide-react"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { getStoredToken } from "@/services/auth.service"
import {
  listConversationMessages,
  listConversations,
  returnConversationToAi,
  sendAgentMessage,
  takeoverConversation,
} from "@/services/conversation.service"
import { listTickets, updateTicketStatus } from "@/services/ticket.service"
import type {
  ConversationMessageRecord,
  ConversationRecord,
} from "@/types/conversation"
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

const messageBubbleStyles: Record<string, string> = {
  customer: "border-primary/30 bg-primary text-primary-foreground",
  assistant: "border-border/60 bg-card text-foreground",
  agent: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  system: "border-amber-500/30 bg-amber-500/10 text-foreground",
}

const formatChannelLabel = (channel?: string) => {
  if (!channel) {
    return "-"
  }

  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

const formatSessionId = (value?: string | null) => {
  if (!value || value === "null") {
    return "-"
  }

  return `#SESS-${value.slice(-4).toUpperCase()}`
}

const isValidConversationId = (value?: string | null): value is string => Boolean(value && value !== "null")

export default function TicketsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all")
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null)
  const [conversationLookup, setConversationLookup] = useState<Record<string, ConversationRecord>>(
    {}
  )
  const [messages, setMessages] = useState<ConversationMessageRecord[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState("")
  const [agentMessageLoading, setAgentMessageLoading] = useState(false)
  const [agentMessageError, setAgentMessageError] = useState<string | null>(null)
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const [takeoverError, setTakeoverError] = useState<string | null>(null)
  const [returnToAiLoading, setReturnToAiLoading] = useState(false)
  const [returnToAiError, setReturnToAiError] = useState<string | null>(null)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false)
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null)

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

        setSelectedTicket((current) => {
          if (!result.tickets.length) {
            return null
          }

          if (current) {
            const match = result.tickets.find((ticket) => ticket._id === current._id)
            return match ?? result.tickets[0]
          }

          return result.tickets[0]
        })
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

  const loadConversationLookup = useCallback(async () => {
    try {
      const result = await listConversations({ limit: 100 })
      const map: Record<string, ConversationRecord> = {}
      result.conversations.forEach((conversation) => {
        map[conversation._id] = conversation
      })
      setConversationLookup(map)
    } catch {
      // Best-effort: tickets can still render without conversation metadata.
    }
  }, [])

  useEffect(() => {
    void loadTickets(false)
  }, [loadTickets])

  useEffect(() => {
    void loadConversationLookup()
  }, [loadConversationLookup])

  useEffect(() => {
    const conversationId = selectedTicket?.conversationId
    if (!isValidConversationId(conversationId)) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      setMessagesLoading(true)
      setMessagesError(null)

      try {
        const result = await listConversationMessages(conversationId, { limit: 200 })
        setMessages(result.messages)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load messages"
        setMessagesError(message)
      } finally {
        setMessagesLoading(false)
      }
    }

    void loadMessages()
  }, [selectedTicket?.conversationId])

  useEffect(() => {
    const token = getStoredToken()
    const socket = getSocket(token)
    if (!socket) {
      return
    }

    const handleMessageNew = (payload: ConversationMessageRecord) => {
      if (!payload?.conversationId) {
        return
      }

      if (payload.conversationId !== selectedTicket?.conversationId) {
        return
      }

      setMessages((prev) => {
        if (prev.some((message) => message._id === payload._id)) {
          return prev
        }

        return [...prev, payload]
      })
    }

    const handleConversationUpdated = (payload: {
      conversationId?: string
      lastMessageAt?: string
      aiEnabled?: boolean
      assignedAgent?: string
    }) => {
      const conversationId = payload?.conversationId
      if (!conversationId) {
        return
      }

      setConversationLookup((prev) => {
        const current = prev[conversationId]
        if (!current) {
          return prev
        }

        return {
          ...prev,
          [conversationId]: {
            ...current,
            lastMessageAt: payload.lastMessageAt ?? current.lastMessageAt,
            aiEnabled:
              typeof payload.aiEnabled === "boolean" ? payload.aiEnabled : current.aiEnabled,
            assignedAgent: payload.assignedAgent ?? current.assignedAgent,
          },
        }
      })
    }

    socket.on("message:new", handleMessageNew)
    socket.on("conversation:updated", handleConversationUpdated)

    return () => {
      socket.off("message:new", handleMessageNew)
      socket.off("conversation:updated", handleConversationUpdated)
    }
  }, [selectedTicket?.conversationId])

  const handleSelectTicket = (ticket: TicketRecord) => {
    setSelectedTicket(ticket)
    setTakeoverError(null)
    setAgentMessageError(null)
    setReturnToAiError(null)
    setStatusUpdateError(null)
  }

  const handleTakeoverConversation = async () => {
    const conversationId = selectedTicket?.conversationId
    if (!isValidConversationId(conversationId)) {
      return
    }

    setTakeoverError(null)
    setReturnToAiError(null)
    setTakeoverLoading(true)

    try {
      const result = await takeoverConversation(conversationId)
      setConversationLookup((prev) => {
        const current = prev[conversationId]
        if (!current) {
          return prev
        }

        return {
          ...prev,
          [conversationId]: {
            ...current,
            aiEnabled: false,
            assignedAgent: result.assignedAgent,
          },
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to take over conversation"
      setTakeoverError(message)
    } finally {
      setTakeoverLoading(false)
    }
  }

  const handleReturnConversationToAi = async () => {
    const conversationId = selectedTicket?.conversationId
    if (!isValidConversationId(conversationId)) {
      return
    }

    setReturnToAiError(null)
    setTakeoverError(null)
    setReturnToAiLoading(true)

    try {
      await returnConversationToAi(conversationId)
      setConversationLookup((prev) => {
        const current = prev[conversationId]
        if (!current) {
          return prev
        }

        return {
          ...prev,
          [conversationId]: {
            ...current,
            aiEnabled: true,
            assignedAgent: null,
          },
        }
      })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to return conversation to AI"
      setReturnToAiError(message)
    } finally {
      setReturnToAiLoading(false)
    }
  }

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    if (!selectedTicket || selectedTicket.status === nextStatus) {
      return
    }

    setStatusUpdateError(null)
    setStatusUpdateLoading(true)

    try {
      const result = await updateTicketStatus(selectedTicket._id, nextStatus)
      const updated = result.ticket

      setTickets((prev) =>
        prev.map((ticket) => (ticket._id === updated._id ? { ...ticket, status: updated.status } : ticket))
      )

      setSelectedTicket((current) =>
        current && current._id === updated._id ? { ...current, status: updated.status } : current
      )
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to update ticket status"
      setStatusUpdateError(message)
    } finally {
      setStatusUpdateLoading(false)
    }
  }

  const handleSendAgentMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const conversationId = selectedTicket?.conversationId
    if (!isValidConversationId(conversationId)) {
      return
    }

    const content = agentMessage.trim()
    if (!content) {
      setAgentMessageError("Please enter a message before sending.")
      return
    }

    setAgentMessageError(null)
    setAgentMessageLoading(true)

    try {
      await sendAgentMessage(conversationId, content)
      setAgentMessage("")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send message"
      setAgentMessageError(message)
    } finally {
      setAgentMessageLoading(false)
    }
  }

  const ticketCountLabel = useMemo(() => `${tickets.length} tickets`, [tickets.length])
  const selectedConversation = useMemo(() => {
    if (!selectedTicket) {
      return null
    }

    const conversationId = selectedTicket.conversationId
    if (!isValidConversationId(conversationId)) {
      return null
    }

    return conversationLookup[conversationId] ?? null
  }, [conversationLookup, selectedTicket])

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
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
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

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
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
                {tickets.map((ticket) => {
                  const isActive = selectedTicket?._id === ticket._id

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
                      onClick={() => handleSelectTicket(ticket)}
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

        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-sm">
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
                  <p className="text-xs text-muted-foreground">
                    {selectedTicket
                      ? `Conversation ${formatSessionId(
                          isValidConversationId(selectedTicket.conversationId)
                            ? selectedTicket.conversationId
                            : null
                        )} · ${
                          selectedTicket.customerName || selectedTicket.customerPhone || "Unknown customer"
                        }`
                      : "Select a ticket to see the conversation and details."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Ticket status"
                  value={selectedTicket?.status ?? "open"}
                  onChange={(event) => handleStatusChange(event.target.value as TicketStatus)}
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
                  onClick={handleReturnConversationToAi}
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
                  onClick={handleTakeoverConversation}
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

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {takeoverError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Takeover failed</AlertTitle>
                <AlertDescription>{takeoverError}</AlertDescription>
              </Alert>
            ) : null}
            {returnToAiError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Return to AI failed</AlertTitle>
                <AlertDescription>{returnToAiError}</AlertDescription>
              </Alert>
            ) : null}
            {statusUpdateError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Ticket status update failed</AlertTitle>
                <AlertDescription>{statusUpdateError}</AlertDescription>
              </Alert>
            ) : null}

            {!selectedTicket ? (
              <Alert>
                <AlertTitle>No ticket selected</AlertTitle>
                <AlertDescription>Select a ticket to load the conversation history.</AlertDescription>
              </Alert>
            ) : messagesError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to load messages</AlertTitle>
                <AlertDescription>{messagesError}</AlertDescription>
              </Alert>
            ) : messagesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="uppercase tracking-[0.12em]">Channel</p>
                      <p className="text-sm text-foreground">
                        {formatChannelLabel(selectedConversation?.channel)}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Assigned agent</p>
                      <p className="text-sm text-foreground">
                        {selectedConversation?.assignedAgent ?? "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Customer</p>
                      <p className="text-sm text-foreground">
                        {selectedTicket.customerName || selectedTicket.customerPhone || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Created</p>
                      <p className="text-sm text-foreground">
                        {formatDateTime(selectedTicket.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <Alert>
                    <AlertTitle>No messages yet</AlertTitle>
                    <AlertDescription>This ticket has no stored conversation messages.</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-5">
                    {messages.map((message) => {
                      const bubbleClass =
                        messageBubbleStyles[message.senderType] ?? messageBubbleStyles.customer
                      const isCustomer = message.senderType === "customer"

                      return (
                        <div
                          key={message._id}
                          className={cn("flex", isCustomer ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm",
                              bubbleClass,
                              isCustomer ? "rounded-tr-none" : "rounded-tl-none"
                            )}
                          >
                            <div
                              className={cn(
                                "flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em]",
                                isCustomer ? "text-primary-foreground/75" : "text-muted-foreground"
                              )}
                            >
                              <span>{message.senderType}</span>
                              <span>{formatDateTime(message.createdAt)}</span>
                            </div>
                            {message.messageType === "text" ? (
                              <p className="mt-2 whitespace-pre-wrap text-sm">
                                {message.contentText || "(No text)"}
                              </p>
                            ) : (
                              <div className="mt-2 space-y-2 text-sm">
                                <p>
                                  Media: {message.messageType}
                                  {message.media?.fileName ? ` - ${message.media.fileName}` : ""}
                                </p>
                                {message.media?.caption ? (
                                  <p className="text-xs text-muted-foreground">
                                    Caption: {message.media.caption}
                                  </p>
                                ) : null}
                                {message.media?.url ? (
                                  <a
                                    href={message.media.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary underline"
                                  >
                                    View media
                                  </a>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedTicket ? (
            selectedConversation?.aiEnabled === false ? (
              <div className="border-t border-border/60 bg-background/80 px-6 py-4">
                <form onSubmit={handleSendAgentMessage} className="space-y-3">
                  {agentMessageError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Unable to send message</AlertTitle>
                      <AlertDescription>{agentMessageError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      value={agentMessage}
                      onChange={(event) => setAgentMessage(event.target.value)}
                      placeholder="Type a reply to the customer..."
                      className="flex-1"
                    />
                    <Button type="submit" className="gap-2" disabled={agentMessageLoading}>
                      {agentMessageLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                      Send
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="border-t border-border/60 bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
                Enable takeover to chat with this customer in real time.
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  )
}
