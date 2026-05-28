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

const getDateKey = (value?: string) => {
  if (!value) {
    return "unknown"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "unknown"
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const formatDateTabLabel = (value: string) => {
  if (value === "unknown") {
    return "Unknown date"
  }

  const today = new Date()
  const todayKey = getDateKey(today.toISOString())

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday.toISOString())

  if (value === todayKey) {
    return "Today"
  }

  if (value === yesterdayKey) {
    return "Yesterday"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    dateStyle: "medium",
  })
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
  const [selectedDateKey, setSelectedDateKey] = useState("")
  const [selectedMessageDateKey, setSelectedMessageDateKey] = useState("")
  const [takeoverLoading, setTakeoverLoading] = useState(false)
  const [takeoverError, setTakeoverError] = useState<string | null>(null)
  const [returnToAiLoading, setReturnToAiLoading] = useState(false)
  const [returnToAiError, setReturnToAiError] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState("")
  const [agentMessageLoading, setAgentMessageLoading] = useState(false)
  const [agentMessageError, setAgentMessageError] = useState<string | null>(null)

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

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === payload.conversationId
            ? {
                ...conversation,
                lastMessageAt: payload.createdAt ?? conversation.lastMessageAt,
              }
            : conversation
        )
      )

      setSelectedConversation((current) =>
        current && current._id === payload.conversationId
          ? {
              ...current,
              lastMessageAt: payload.createdAt ?? current.lastMessageAt,
            }
          : current
      )

      if (selectedConversation?._id !== payload.conversationId) {
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
      if (!payload?.conversationId) {
        return
      }

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === payload.conversationId
            ? {
                ...conversation,
                lastMessageAt: payload.lastMessageAt ?? conversation.lastMessageAt,
                aiEnabled:
                  typeof payload.aiEnabled === "boolean" ? payload.aiEnabled : conversation.aiEnabled,
                assignedAgent: payload.assignedAgent ?? conversation.assignedAgent,
              }
            : conversation
        )
      )

      setSelectedConversation((current) =>
        current && current._id === payload.conversationId
          ? {
              ...current,
              lastMessageAt: payload.lastMessageAt ?? current.lastMessageAt,
              aiEnabled:
                typeof payload.aiEnabled === "boolean" ? payload.aiEnabled : current.aiEnabled,
              assignedAgent: payload.assignedAgent ?? current.assignedAgent,
            }
          : current
      )
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
    if (!term) {
      return conversations
    }

    return conversations.filter((conversation) => {
      const phone = conversation.customerPhone?.toLowerCase() ?? ""
      const name = conversation.customerName?.toLowerCase() ?? ""
      return phone.includes(term) || name.includes(term)
    })
  }, [conversations, searchTerm])

  const dateTabs = useMemo(() => {
    const grouped = new Map<string, ConversationRecord[]>()

    filteredConversations.forEach((conversation) => {
      const dateKey = getDateKey(conversation.lastMessageAt ?? conversation.createdAt)
      const current = grouped.get(dateKey) ?? []
      current.push(conversation)
      grouped.set(dateKey, current)
    })

    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

    return sortedKeys.map((key) => ({
      key,
      label: formatDateTabLabel(key),
      conversations: grouped.get(key) ?? [],
    }))
  }, [filteredConversations])

  useEffect(() => {
    if (!dateTabs.length) {
      return
    }

    if (!selectedDateKey || !dateTabs.some((tab) => tab.key === selectedDateKey)) {
      setSelectedDateKey(dateTabs[0].key)
    }
  }, [dateTabs, selectedDateKey])

  const messageDateTabs = useMemo(() => {
    const grouped = new Map<string, ConversationMessageRecord[]>()

    messages.forEach((message) => {
      const dateKey = getDateKey(message.createdAt)
      const current = grouped.get(dateKey) ?? []
      current.push(message)
      grouped.set(dateKey, current)
    })

    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

    return sortedKeys.map((key) => ({
      key,
      label: formatDateTabLabel(key),
      messages: grouped.get(key) ?? [],
    }))
  }, [messages])

  useEffect(() => {
    if (!messageDateTabs.length) {
      return
    }

    const todayKey = getDateKey(new Date().toISOString())
    
    if (!selectedMessageDateKey || !messageDateTabs.some((tab) => tab.key === selectedMessageDateKey)) {
      if (messageDateTabs.some((tab) => tab.key === todayKey)) {
        setSelectedMessageDateKey(todayKey)
      } else {
        setSelectedMessageDateKey(messageDateTabs[0].key)
      }
    }
  }, [messageDateTabs, selectedMessageDateKey])

  const handleSelectConversation = (conversation: ConversationRecord) => {
    setSelectedConversation(conversation)
  }

  const handleTakeoverConversation = async () => {
    if (!selectedConversation) {
      return
    }

    setTakeoverError(null)
    setReturnToAiError(null)
    setTakeoverLoading(true)

    try {
      const result = await takeoverConversation(selectedConversation._id)

      setSelectedConversation((current) =>
        current && current._id === selectedConversation._id
          ? {
              ...current,
              aiEnabled: false,
              assignedAgent: result.assignedAgent,
            }
          : current
      )

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === selectedConversation._id
            ? {
                ...conversation,
                aiEnabled: false,
                assignedAgent: result.assignedAgent,
              }
            : conversation
        )
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to take over conversation"
      setTakeoverError(message)
    } finally {
      setTakeoverLoading(false)
    }
  }

  const handleReturnConversationToAi = async () => {
    if (!selectedConversation) {
      return
    }

    setReturnToAiError(null)
    setTakeoverError(null)
    setReturnToAiLoading(true)

    try {
      await returnConversationToAi(selectedConversation._id)

      setSelectedConversation((current) =>
        current && current._id === selectedConversation._id
          ? {
              ...current,
              aiEnabled: true,
              assignedAgent: null,
            }
          : current
      )

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation._id === selectedConversation._id
            ? {
                ...conversation,
                aiEnabled: true,
                assignedAgent: null,
              }
            : conversation
        )
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to return conversation to AI"
      setReturnToAiError(message)
    } finally {
      setReturnToAiLoading(false)
    }
  }

  const handleSendAgentMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedConversation) {
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
      await sendAgentMessage(selectedConversation._id, content)
      setAgentMessage("")
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send message"
      setAgentMessageError(message)
    } finally {
      setAgentMessageLoading(false)
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
                <div className="sticky top-0 z-10 -mx-4 -mt-4 flex flex-wrap gap-2 bg-card/95 px-4 pb-3 pt-4 backdrop-blur-sm">
                  {dateTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
                        selectedDateKey === tab.key
                          ? "border border-primary/40 bg-primary/10 text-primary"
                          : "border border-border/60 bg-background text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => setSelectedDateKey(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>


                {(dateTabs.find((tab) => tab.key === selectedDateKey)?.conversations ?? []).map(
                  (conversation) => {
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
                }
                )}
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
                  className="h-9 rounded-full bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25"
                  onClick={handleReturnConversationToAi}
                  disabled={!selectedConversation || selectedConversation.aiEnabled === true || returnToAiLoading}
                >
                  {returnToAiLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Return to AI
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-full bg-rose-500/15 px-4 text-xs font-semibold text-rose-400 hover:bg-rose-500/25"
                  onClick={handleTakeoverConversation}
                  disabled={!selectedConversation || selectedConversation?.aiEnabled === false || takeoverLoading}
                >
                  {takeoverLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Take Over Chat
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
                    <div className="sticky top-0 z-10 -mx-6 -mt-2 px-6 py-2 flex flex-wrap gap-2 bg-background/80 backdrop-blur-sm border-b border-border/60">
                      {messageDateTabs.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition",
                            selectedMessageDateKey === tab.key
                              ? "border border-primary/40 bg-primary/10 text-primary"
                              : "border border-border/60 bg-background text-muted-foreground hover:bg-muted"
                          )}
                          onClick={() => setSelectedMessageDateKey(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {(messageDateTabs.find((tab) => tab.key === selectedMessageDateKey)?.messages ?? []).map((message) => {
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

          {selectedConversation && selectedConversation.aiEnabled === false ? (
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
          ) : selectedConversation ? (
            <div className="border-t border-border/60 bg-muted/40 px-6 py-4 text-xs text-muted-foreground">
              Enable takeover to chat with this customer in real time.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
