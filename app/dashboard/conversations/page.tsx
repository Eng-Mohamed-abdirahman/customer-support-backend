"use client"

import {
  AlertCircle,
  Bell,
  Download,
  Flag,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

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
import { cn } from "@/lib/utils"
import { listConversationMessages, listConversations } from "@/services/conversation.service"
import { createTicket } from "@/services/ticket.service"
import type { ConversationMessageRecord, ConversationRecord } from "@/types/conversation"

const statusFilters = ["all", "open", "pending", "closed"] as const
const channelFilters = ["all", "whatsapp", "website", "dashboard"] as const

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

const formatTimeAgo = (value?: string) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute))
    return `${minutes}m ago`
  }
  if (diffMs < day) {
    const hours = Math.round(diffMs / hour)
    return `${hours}h ago`
  }

  const days = Math.round(diffMs / day)
  return `${days}d ago`
}

const formatChannelLabel = (channel?: string) => {
  if (!channel) {
    return "-"
  }

  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

const formatSessionId = (value?: string) => {
  if (!value) {
    return "-"
  }

  return `#SESS-${value.slice(-4).toUpperCase()}`
}

const getStatusTone = (status?: string) => {
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

const getInitials = (value?: string) => {
  if (!value) {
    return "NA"
  }

  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function ConversationsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null)
  const [messages, setMessages] = useState<ConversationMessageRecord[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all")
  const [channelFilter, setChannelFilter] = useState<(typeof channelFilters)[number]>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false)
  const [ticketTitle, setTicketTitle] = useState("")
  const [ticketDescription, setTicketDescription] = useState("")
  const [ticketLoading, setTicketLoading] = useState(false)
  const [ticketError, setTicketError] = useState<string | null>(null)
  const [ticketBanner, setTicketBanner] = useState<string | null>(null)

  const loadConversations = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }

      setLoadError(null)

      try {
        const result = await listConversations({
          status: statusFilter === "all" ? undefined : statusFilter,
          channel: channelFilter === "all" ? undefined : channelFilter,
          limit: 50,
        })

        setConversations(result.conversations)

        if (result.conversations.length > 0) {
          setSelectedConversation((current) => {
            if (current) {
              const match = result.conversations.find((row) => row._id === current._id)
              return match ?? result.conversations[0]
            }

            return result.conversations[0]
          })
        } else {
          setSelectedConversation(null)
          setMessages([])
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load conversations"
        setLoadError(message)
      } finally {
        if (refresh) {
          setIsRefreshing(false)
        } else {
          setIsLoading(false)
        }
      }
    },
    [channelFilter, statusFilter]
  )

  const loadMessages = useCallback(async (conversationId: string) => {
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
  }, [])

  useEffect(() => {
    void loadConversations(false)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversation?._id) {
      return
    }

    void loadMessages(selectedConversation._id)
  }, [loadMessages, selectedConversation?._id])

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      return conversations
    }

    return conversations.filter((conversation) => {
      const phone = conversation.customerPhone?.toLowerCase() ?? ""
      const name = conversation.customerName?.toLowerCase() ?? ""
      return phone.includes(term) || name.includes(term)
    })
  }, [conversations, searchTerm])

  const handleSelectConversation = (conversation: ConversationRecord) => {
    setSelectedConversation(conversation)
  }

  const handleOpenTicketDialog = () => {
    setTicketError(null)
    setTicketTitle("")
    setTicketDescription("")
    setIsTicketDialogOpen(true)
  }

  const handleCreateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedConversation) {
      setTicketError("Select a conversation before creating a ticket.")
      return
    }

    setTicketError(null)
    setTicketLoading(true)

    try {
      const result = await createTicket({
        conversationId: selectedConversation._id,
        title: ticketTitle,
        description: ticketDescription,
        customerName: selectedConversation.customerName,
        customerPhone: selectedConversation.customerPhone,
      })

      setTicketBanner(`Ticket ${result.ticketId.slice(-6).toUpperCase()} created.`)
      setIsTicketDialogOpen(false)
      setTicketTitle("")
      setTicketDescription("")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create ticket"
      setTicketError(message)
    } finally {
      setTicketLoading(false)
    }
  }

  const liveCount = filteredConversations.length

  return (
    <div className="space-y-6 font-heading">
      <header className="rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Workspace / Conversations
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Conversation Logs
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Monitor live sessions, review responses, and jump into active customer conversations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative hidden items-center md:flex">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search transcripts or sessions..."
                className="h-10 w-72 rounded-full border-border/60 bg-background pl-9"
              />
            </div>
            <Button className="h-10 gap-2 rounded-full px-4">
              <Download className="size-4" />
              Export Logs
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 rounded-full p-0"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/40">
              <UserRound className="size-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load conversations</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-sm">
          <div className="space-y-4 border-b border-border/60 bg-muted/30 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Recent Sessions
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">
                {liveCount} live
              </span>
            </div>

            <div className="flex gap-2">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {channelFilters.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
                    channelFilter === channel
                      ? "border border-primary/40 bg-primary/10 text-primary"
                      : "border border-border/60 bg-background text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setChannelFilter(channel)}
                >
                  {channel}
                </button>
              ))}
            </div>

            <div className="relative md:hidden">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search transcripts or sessions..."
                className="h-10 w-full rounded-full border-border/60 bg-background pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <Alert>
                <AlertTitle>No conversations yet</AlertTitle>
                <AlertDescription>
                  WhatsApp and web chat sessions will appear here when customers reach out.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((conversation) => {
                  const isActive = selectedConversation?._id === conversation._id
                  const name = conversation.customerName || conversation.customerPhone
                  const initials = getInitials(conversation.customerName || conversation.customerPhone)

                  return (
                    <button
                      key={conversation._id}
                      type="button"
                      className={cn(
                        "w-full rounded-2xl border border-border/70 bg-background/70 p-4 text-left transition",
                        isActive
                          ? "border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]"
                          : "hover:bg-muted/40"
                      )}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-xs font-semibold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatChannelLabel(conversation.channel)}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {formatTimeAgo(conversation.lastMessageAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[11px]">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            getStatusTone(conversation.status)
                          )}
                        >
                          {conversation.status}
                        </span>
                        <span className="text-muted-foreground">
                          {formatSessionId(conversation._id)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

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
                      {selectedConversation
                        ? `Customer Session ${formatSessionId(selectedConversation._id)}`
                        : "Conversation detail"}
                    </h2>
                    {selectedConversation ? (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          getStatusTone(selectedConversation.status)
                        )}
                      >
                        {selectedConversation.status}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation
                      ? `Started ${formatTimeAgo(selectedConversation.createdAt)} from ${
                          selectedConversation.customerName ?? selectedConversation.customerPhone
                        }`
                      : "Select a session to see the full conversation."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-9 rounded-full p-0"
                  aria-label="Flag conversation"
                >
                  <Flag className="size-4" />
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-full bg-rose-500/15 px-4 text-xs font-semibold text-rose-400 hover:bg-rose-500/25"
                  onClick={handleOpenTicketDialog}
                  disabled={!selectedConversation}
                >
                  Takeover Chat
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-2 rounded-full px-4 text-xs"
                  onClick={() => void loadConversations(true)}
                  disabled={isLoading || isRefreshing}
                >
                  {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {ticketBanner ? (
              <Alert className="mb-4">
                <AlertTitle>Ticket created</AlertTitle>
                <AlertDescription>{ticketBanner}</AlertDescription>
              </Alert>
            ) : null}
            {!selectedConversation ? (
              <Alert>
                <AlertTitle>No conversation selected</AlertTitle>
                <AlertDescription>Select a thread from the inbox to load messages.</AlertDescription>
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
                      <p className="uppercase tracking-[0.12em]">Status</p>
                      <p className="text-sm text-foreground">{selectedConversation.status}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Channel</p>
                      <p className="text-sm text-foreground">
                        {formatChannelLabel(selectedConversation.channel)}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Assigned agent</p>
                      <p className="text-sm text-foreground">
                        {selectedConversation.assignedAgent ?? "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.12em]">Last activity</p>
                      <p className="text-sm text-foreground">
                        {formatDateTime(selectedConversation.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <Alert>
                    <AlertTitle>No messages yet</AlertTitle>
                    <AlertDescription>This conversation has no stored messages.</AlertDescription>
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
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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

                            {message.senderType === "assistant" ? (
                              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                <span>Admin feedback</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-full p-1 text-muted-foreground hover:text-emerald-400"
                                  >
                                    <ThumbsUp className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full p-1 text-muted-foreground hover:text-amber-400"
                                  >
                                    <ThumbsDown className="size-3" />
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a human handoff ticket</DialogTitle>
            <DialogDescription>
              Add a short title and description so your admin can follow up.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Title
              </label>
              <Input
                value={ticketTitle}
                onChange={(event) => setTicketTitle(event.target.value)}
                placeholder="API key reset failed"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Description
              </label>
              <textarea
                value={ticketDescription}
                onChange={(event) => setTicketDescription(event.target.value)}
                placeholder="Provide a short summary of the issue and next steps."
                className="min-h-[120px] w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                required
              />
            </div>

            {ticketError ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create ticket</AlertTitle>
                <AlertDescription>{ticketError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsTicketDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={ticketLoading}>
                {ticketLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                Create ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
