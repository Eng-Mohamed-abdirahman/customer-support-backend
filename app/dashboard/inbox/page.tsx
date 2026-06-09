"use client"

import {
  AlertCircle,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react"
import Link from "next/link"
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
import { getContactByPhone, updateContact } from "@/services/contact.service"
import {
  listConversationMessages,
  listConversations,
  returnConversationToAi,
  sendAgentMessage,
  takeoverConversation,
} from "@/services/conversation.service"
import type { ContactRecord } from "@/types/contact"
import type { ConversationMessageRecord, ConversationRecord } from "@/types/conversation"

const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000
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

const isWhatsAppSessionActive = (messages: ConversationMessageRecord[]) => {
  const lastCustomerMessage = [...messages]
    .reverse()
    .find((message) => message.senderType === "customer")

  if (!lastCustomerMessage?.createdAt) {
    return false
  }

  const lastAt = new Date(lastCustomerMessage.createdAt).getTime()
  if (Number.isNaN(lastAt)) {
    return false
  }

  return Date.now() - lastAt < WHATSAPP_SESSION_MS
}

export default function InboxPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneFromQuery = searchParams.get("phone")

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
  const [contact, setContact] = useState<ContactRecord | null>(null)
  const [contactLoading, setContactLoading] = useState(false)
  const [noteDraft, setNoteDraft] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)

  const loadConversations = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true)
      else setIsLoading(true)

      setLoadError(null)

      try {
        const result = await listConversations({
          status: statusFilter === "all" ? undefined : statusFilter,
          channel: "whatsapp",
          limit: 50,
        })

        setConversations(result.conversations)

        if (phoneFromQuery) {
          const match = result.conversations.find(
            (row) => row.customerPhone === phoneFromQuery || row.customerPhone === `+${phoneFromQuery.replace(/^\+/, "")}`
          )
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
        const message = error instanceof Error ? error.message : "Failed to load inbox"
        setLoadError(message)
      } finally {
        if (refresh) setIsRefreshing(false)
        else setIsLoading(false)
      }
    },
    [phoneFromQuery, statusFilter]
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

  const loadContact = useCallback(async (phone?: string) => {
    if (!phone) {
      setContact(null)
      setNoteDraft("")
      return
    }

    setContactLoading(true)

    try {
      const record = await getContactByPhone(phone)
      setContact(record)
      setNoteDraft(record?.notes ?? "")
    } catch {
      setContact(null)
      setNoteDraft("")
    } finally {
      setContactLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations(false)
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversation?._id) return
    void loadMessages(selectedConversation._id)
    void loadContact(selectedConversation.customerPhone)
  }, [loadContact, loadMessages, selectedConversation?._id, selectedConversation?.customerPhone])

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
      const phone = conversation.customerPhone?.toLowerCase() ?? ""
      const name = conversation.customerName?.toLowerCase() ?? ""
      return phone.includes(term) || name.includes(term)
    })
  }, [conversations, searchTerm])

  const sessionActive = useMemo(() => {
    if (selectedConversation?.channel !== "whatsapp") return true
    return isWhatsAppSessionActive(messages)
  }, [messages, selectedConversation?.channel])

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

    if (!sessionActive) {
      setAgentMessageError("Session expired. Use a template to re-engage.")
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

  const handleSaveNote = async () => {
    if (!contact) return

    setNoteSaving(true)

    try {
      const updated = await updateContact(contact._id, { notes: noteDraft })
      setContact(updated)
    } catch (error) {
      console.error("Failed to save note", error)
    } finally {
      setNoteSaving(false)
    }
  }

  const displayName =
    selectedConversation?.customerName ||
    contact?.name ||
    selectedConversation?.customerPhone ||
    "Select a conversation"

  const canReply =
    selectedConversation &&
    sessionActive &&
    (selectedConversation.responderType === "agent" || selectedConversation.channel === "whatsapp")

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 font-heading">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">WhatsApp conversations and live customer threads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/contacts">
              <Plus className="size-4" />
              Add Contact
            </Link>
          </Button>
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
        </div>
      </header>

      {loadError ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Unable to load inbox</AlertTitle>
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
                placeholder="Search conversations..."
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
              filteredConversations.map((conversation) => {
                const isActive = selectedConversation?._id === conversation._id
                const name = conversation.customerName || conversation.customerPhone

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => {
                      setSelectedConversation(conversation)
                      router.replace("/dashboard/inbox")
                    }}
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

        {/* Chat panel */}
        <div className="flex min-h-0 flex-col border-b border-border/60 lg:border-b-0 lg:border-r">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                    {selectedConversation.channel === "whatsapp" ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          sessionActive
                            ? "border-emerald-500/40 text-emerald-500"
                            : "border-rose-500/40 text-rose-500"
                        )}
                      >
                        {sessionActive ? "Active" : "Expired"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedConversation.customerPhone}</p>
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

              {!sessionActive && selectedConversation.channel === "whatsapp" ? (
                <div className="border-t border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm text-amber-200">
                  24-hour session expired. Use a template to re-engage.
                </div>
              ) : null}

              <div className="border-t border-border/60 p-4">
                {agentMessageError ? (
                  <p className="mb-2 text-sm text-destructive">{agentMessageError}</p>
                ) : null}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={agentMessage}
                    onChange={(event) => setAgentMessage(event.target.value)}
                    placeholder={
                      sessionActive
                        ? selectedConversation.responderType === "agent"
                          ? "Type a message..."
                          : "Take over to reply, or send to auto-takeover..."
                        : "Session expired - use a template"
                    }
                    disabled={!sessionActive}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={!canReply || agentMessageLoading || !agentMessage.trim()}
                  >
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

        {/* Contact details */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-5">
          {selectedConversation ? (
            contactLoading ? (
              <div className="space-y-3">
                <Skeleton className="mx-auto size-20 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary">
                    {getInitials(displayName)}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedConversation.customerPhone}</p>
                  {contact?.email ? (
                    <p className="mt-1 text-sm text-muted-foreground">{contact.email}</p>
                  ) : null}
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </p>
                  {contact?.tags?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tags</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  {contact ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Add a note..."
                        rows={4}
                        className="w-full resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleSaveNote()}
                        disabled={noteSaving || noteDraft === (contact.notes ?? "")}
                      >
                        {noteSaving ? <Loader2 className="size-4 animate-spin" /> : "Save note"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Contact not in your list yet.</p>
                      <Button size="sm" variant="outline" asChild>
                        <Link href="/dashboard/contacts">Add to contacts</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <p className="text-center text-sm text-muted-foreground">Contact details appear here</p>
          )}
        </div>
      </section>
    </div>
  )
}
