"use client"

import {
  AlertCircle,
  Globe,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { ConversationMessageRecord, ConversationRecord } from "@/types/conversation"

const statusFilters = ["all", "open", "pending", "closed"] as const

const formatTimeAgo = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute))
    return `${minutes}m`
  }
  if (diffMs < day) {
    return `${Math.round(diffMs / hour)}h`
  }
  return `${Math.round(diffMs / day)} days`
}

const formatMessageTime = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

const formatDateSeparator = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

const getInitials = (value?: string) => {
  if (!value) return "?"
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

const getWebsiteCustomerLabel = (conversation: ConversationRecord) => {
  const customer = conversation.metadata?.customer

  if (conversation.customerName) return conversation.customerName
  if (customer?.name) return customer.name
  if (customer?.email) return customer.email
  if (customer?.id) return customer.id

  const identifier = conversation.customerPhone
  if (identifier.startsWith("ip:")) return `Visitor (${identifier.slice(3)})`
  if (identifier === "anonymous") return "Anonymous visitor"
  if (identifier.includes("@")) return identifier

  return identifier
}

const getWebsiteCustomerSubtext = (conversation: ConversationRecord) => {
  const customer = conversation.metadata?.customer
  const label = getWebsiteCustomerLabel(conversation)

  if (customer?.email && label !== customer.email) return customer.email
  if (customer?.id && label !== customer.id) return customer.id
  if (conversation.customerPhone.startsWith("ip:")) return conversation.customerPhone
  if (conversation.customerPhone !== label) return conversation.customerPhone

  return ""
}

export default function ConversationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationFromQuery = searchParams.get("id")

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRecord[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null)
  const [messages, setMessages] = useState<ConversationMessageRecord[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const [returnToAiLoading, setReturnToAiLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState("")
  const [agentMessageLoading, setAgentMessageLoading] = useState(false)
  const [agentMessageError, setAgentMessageError] = useState<string | null>(null)

  const loadConversations = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true)
      else setIsLoading(true)

      setLoadError(null)

      try {
        const result = await listConversations({
          status: statusFilter === "all" ? undefined : statusFilter,
          channel: "website",
          limit: 50,
        })

        setConversations(result.conversations)

        if (conversationFromQuery) {
          const match = result.conversations.find((row) => row._id === conversationFromQuery)
          setSelectedConversation(match ?? result.conversations[0] ?? null)
        } else {
          setSelectedConversation((current) => {
            if (current) {
              const match = result.conversations.find((row) => row._id === current._id)
              return match ?? result.conversations[0] ?? null
            }
            return result.conversations[0] ?? null
          })
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load conversations"
        setLoadError(message)
      } finally {
        if (refresh) setIsRefreshing(false)
        else setIsLoading(false)
      }
    },
    [conversationFromQuery, statusFilter]
  )

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) {
      setMessagesLoading(true)
      setMessagesError(null)
    }

    try {
      const result = await listConversationMessages(conversationId, { limit: 200 })
      setMessages(result.messages)
    } catch (error: unknown) {
      if (!silent) {
        const message = error instanceof Error ? error.message : "Failed to load messages"
        setMessagesError(message)
      }
    } finally {
      if (!silent) {
        setMessagesLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadConversations(false)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversation?._id) return
    void loadMessages(selectedConversation._id)
  }, [loadMessages, selectedConversation?._id])

  useEffect(() => {
    if (!selectedConversation?._id) return

    const interval = setInterval(() => {
      void loadMessages(selectedConversation._id, true)
      void loadConversations(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [loadConversations, loadMessages, selectedConversation?._id])

  useEffect(() => {
    const token = getStoredToken()
    const socket = getSocket(token)
    if (!socket) return

    const handleMessageNew = (payload: ConversationMessageRecord) => {
      if (!payload?.conversationId) return

      setConversations((prev) => {
        const updated = prev.map((conversation) =>
          conversation._id === payload.conversationId
            ? {
                ...conversation,
                lastMessageAt: payload.createdAt ?? conversation.lastMessageAt,
                lastMessageText:
                  payload.messageType === "text"
                    ? payload.contentText
                    : `[Media: ${payload.messageType}]`,
                lastMessageSender: payload.senderType,
              }
            : conversation
        )

        return [...updated].sort((a, b) => {
          const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
          const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
          return bTime - aTime
        })
      })

      if (selectedConversation?._id !== payload.conversationId) return

      setMessages((prev) => {
        if (prev.some((message) => message._id === payload._id)) return prev
        return [...prev, payload]
      })
    }

    const handleConversationUpdated = (payload: {
      conversationId?: string
      responderType?: "ai" | "agent"
      assignedAgent?: string
    }) => {
      if (!payload?.conversationId) return

      const patch = (conversation: ConversationRecord) =>
        conversation._id === payload.conversationId
          ? {
              ...conversation,
              responderType: payload.responderType ?? conversation.responderType,
              assignedAgent: payload.assignedAgent ?? conversation.assignedAgent,
              aiEnabled: payload.responderType ? payload.responderType === "ai" : conversation.aiEnabled,
            }
          : conversation

      setConversations((prev) => prev.map(patch))
      setSelectedConversation((current) => (current ? patch(current) : current))
    }

    socket.on("message:new", handleMessageNew)
    socket.on("conversation:updated", handleConversationUpdated)

    return () => {
      socket.off("message:new", handleMessageNew)
      socket.off("conversation:updated", handleConversationUpdated)
    }
  }, [selectedConversation?._id])

  const filteredConversations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return conversations

    return conversations.filter((conversation) => {
      const label = getWebsiteCustomerLabel(conversation).toLowerCase()
      const subtext = getWebsiteCustomerSubtext(conversation).toLowerCase()
      const identifier = conversation.customerPhone?.toLowerCase() ?? ""
      const email = conversation.metadata?.customer?.email?.toLowerCase() ?? ""
      return (
        label.includes(term) ||
        subtext.includes(term) ||
        identifier.includes(term) ||
        email.includes(term)
      )
    })
  }, [conversations, searchTerm])

  const groupedMessages = useMemo(() => {
    const groups: Array<{ date: string; messages: ConversationMessageRecord[] }> = []
    let currentDate = ""

    for (const message of messages) {
      const date = formatDateSeparator(message.createdAt)
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [message] })
      } else {
        groups[groups.length - 1].messages.push(message)
      }
    }

    return groups
  }, [messages])

  const handleTakeover = async () => {
    if (!selectedConversation) return
    setActionError(null)
    setTakeoverLoading(true)

    try {
      const result = await takeoverConversation(selectedConversation._id)
      const patch = (conversation: ConversationRecord) =>
        conversation._id === selectedConversation._id
          ? { ...conversation, aiEnabled: false, responderType: "agent" as const, assignedAgent: result.assignedAgent }
          : conversation

      setSelectedConversation((current) => (current ? patch(current) : current))
      setConversations((prev) => prev.map(patch))
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Failed to take over chat")
    } finally {
      setTakeoverLoading(false)
    }
  }

  const handleReturnToAi = async () => {
    if (!selectedConversation) return
    setActionError(null)
    setReturnToAiLoading(true)

    try {
      await returnConversationToAi(selectedConversation._id)
      const patch = (conversation: ConversationRecord) =>
        conversation._id === selectedConversation._id
          ? { ...conversation, aiEnabled: true, responderType: "ai" as const, assignedAgent: null }
          : conversation

      setSelectedConversation((current) => (current ? patch(current) : current))
      setConversations((prev) => prev.map(patch))
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Failed to return to AI")
    } finally {
      setReturnToAiLoading(false)
    }
  }

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedConversation) return

    const content = agentMessage.trim()
    if (!content) {
      setAgentMessageError("Please enter a message.")
      return
    }

    setAgentMessageError(null)
    setAgentMessageLoading(true)

    try {
      if (selectedConversation.responderType !== "agent") {
        setTakeoverLoading(true)
        try {
          const result = await takeoverConversation(selectedConversation._id)
          const patch = (conversation: ConversationRecord) =>
            conversation._id === selectedConversation._id
              ? {
                  ...conversation,
                  aiEnabled: false,
                  responderType: "agent" as const,
                  assignedAgent: result.assignedAgent,
                }
              : conversation

          setSelectedConversation((current) => (current ? patch(current) : current))
          setConversations((prev) => prev.map(patch))
        } finally {
          setTakeoverLoading(false)
        }
      }

      await sendAgentMessage(selectedConversation._id, content)
      setAgentMessage("")
      void loadMessages(selectedConversation._id, true)
    } catch (error: unknown) {
      setAgentMessageError(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setAgentMessageLoading(false)
    }
  }

  const displayName = selectedConversation
    ? getWebsiteCustomerLabel(selectedConversation)
    : "Select a conversation"

  const displaySubtext = selectedConversation ? getWebsiteCustomerSubtext(selectedConversation) : ""

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-9 font-bold text-navy-800 sm:text-[32px] sm:leading-10">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            Website chat threads from your embedded widget
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void loadConversations(true)}
          disabled={isLoading || isRefreshing}
        >
          <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load conversations</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid min-h-0 flex-1 gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card/95 lg:grid-cols-[300px_1fr_280px]">
        {/* Conversation list */}
        <div className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name or email..."
                className="h-9 pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof statusFilters)[number])}
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
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
                <Globe className="size-8 opacity-40" />
                <p>No website conversations yet.</p>
                <p className="max-w-xs text-xs">
                  Conversations appear here when visitors chat through your website widget using your
                  API key.
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isActive = selectedConversation?._id === conversation._id
                const name = getWebsiteCustomerLabel(conversation)
                const subtext = getWebsiteCustomerSubtext(conversation)

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => {
                      setSelectedConversation(conversation)
                      router.replace(`/dashboard/conversations?id=${conversation._id}`)
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-muted/40",
                      isActive && "bg-teal-50"
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold text-primary">
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{name}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTimeAgo(conversation.lastMessageAt)}
                        </span>
                      </div>
                      {subtext ? (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{subtext}</p>
                      ) : null}
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

        {/* Chat panel */}
        <div className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                    <Badge variant="outline" className="border-sky-500/40 text-sky-500">
                      Website
                    </Badge>
                    {selectedConversation.responderType === "ai" ? (
                      <Badge variant="secondary">AI</Badge>
                    ) : (
                      <Badge variant="secondary">Agent</Badge>
                    )}
                  </div>
                  {displaySubtext ? (
                    <p className="text-sm text-muted-foreground">{displaySubtext}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedConversation.status}
                    className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs"
                    disabled
                  >
                    <option value={selectedConversation.status}>
                      {selectedConversation.status.charAt(0).toUpperCase() +
                        selectedConversation.status.slice(1)}
                    </option>
                  </select>

                  {selectedConversation.responderType === "agent" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleReturnToAi()}
                      disabled={returnToAiLoading}
                    >
                      {returnToAiLoading ? <Loader2 className="size-4 animate-spin" /> : "Return to AI"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => void handleTakeover()} disabled={takeoverLoading}>
                      {takeoverLoading ? <Loader2 className="size-4 animate-spin" /> : "Take Over"}
                    </Button>
                  )}
                </div>
              </div>

              {actionError ? (
                <div className="px-5 pt-3">
                  <p className="text-sm text-destructive">{actionError}</p>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {messagesError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Unable to load messages</AlertTitle>
                    <AlertDescription>{messagesError}</AlertDescription>
                  </Alert>
                ) : messagesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 w-2/3 rounded-2xl" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">No messages in this thread yet.</p>
                ) : (
                  <div className="space-y-4">
                    {groupedMessages.map((group) => (
                      <div key={group.date} className="space-y-3">
                        <p className="text-center text-xs text-muted-foreground">{group.date}</p>
                        {group.messages.map((message) => {
                          if (message.senderType === "system") {
                            return (
                              <p
                                key={message._id}
                                className="text-center text-xs text-muted-foreground"
                              >
                                {message.contentText}
                              </p>
                            )
                          }

                          const isOutgoing =
                            message.senderType === "agent" || message.senderType === "assistant"

                          return (
                            <div
                              key={message._id}
                              className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={cn(
                                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                                  isOutgoing
                                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                                    : "rounded-tl-sm bg-muted text-foreground"
                                )}
                              >
                                <p className="whitespace-pre-wrap">
                                  {message.messageType === "text"
                                    ? message.contentText || "(No text)"
                                    : `[${message.messageType}]`}
                                </p>
                                <p
                                  className={cn(
                                    "mt-1 text-[10px]",
                                    isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}
                                >
                                  {formatMessageTime(message.createdAt)}
                                  {message.senderType === "assistant" ? " · AI" : ""}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 p-4">
                {agentMessageError ? (
                  <p className="mb-2 text-sm text-destructive">{agentMessageError}</p>
                ) : null}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={agentMessage}
                    onChange={(event) => setAgentMessage(event.target.value)}
                    placeholder={
                      selectedConversation.responderType === "agent"
                        ? "Type a message..."
                        : "Send to reply (auto take over)..."
                    }
                    className="flex-1"
                  />
                  <Button type="submit" disabled={agentMessageLoading || !agentMessage.trim()}>
                    {agentMessageLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
              <MessageSquare className="size-10 opacity-40" />
              <p>Select a conversation to view messages</p>
            </div>
          )}
        </div>

        {/* Visitor details */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-5">
          {selectedConversation ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-mint text-2xl font-semibold text-primary">
                  {getInitials(displayName)}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{displayName}</h3>
                {displaySubtext ? (
                  <p className="text-sm text-muted-foreground">{displaySubtext}</p>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Visitor
                </p>
                <dl className="space-y-2 text-sm">
                  {selectedConversation.metadata?.customer?.email ? (
                    <div>
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium">{selectedConversation.metadata.customer.email}</dd>
                    </div>
                  ) : null}
                  {selectedConversation.metadata?.customer?.id ? (
                    <div>
                      <dt className="text-muted-foreground">Customer ID</dt>
                      <dd className="font-medium break-all">
                        {selectedConversation.metadata.customer.id}
                      </dd>
                    </div>
                  ) : null}
                  {!selectedConversation.metadata?.customer?.email &&
                  !selectedConversation.metadata?.customer?.id ? (
                    <div>
                      <dt className="text-muted-foreground">Identifier</dt>
                      <dd className="font-medium break-all">{selectedConversation.customerPhone}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Session
                </p>
                <dl className="space-y-2 text-sm">
                  {selectedConversation.metadata?.origin ? (
                    <div>
                      <dt className="text-muted-foreground">Origin</dt>
                      <dd className="break-all font-medium">{selectedConversation.metadata.origin}</dd>
                    </div>
                  ) : null}
                  {selectedConversation.metadata?.referer ? (
                    <div>
                      <dt className="text-muted-foreground">Referrer</dt>
                      <dd className="break-all font-medium">{selectedConversation.metadata.referer}</dd>
                    </div>
                  ) : null}
                  {selectedConversation.createdAt ? (
                    <div>
                      <dt className="text-muted-foreground">Started</dt>
                      <dd className="font-medium">
                        {new Date(selectedConversation.createdAt).toLocaleString()}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Visitor details appear here</p>
          )}
        </div>
      </section>
    </div>
  )
}
