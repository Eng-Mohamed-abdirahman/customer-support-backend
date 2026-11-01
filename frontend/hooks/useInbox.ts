import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

import {
  formatDateSeparator,
  isWhatsAppSessionActive,
  playAlertSound,
  type InboxStatusFilter,
} from "@/components/inbox/inbox-utils"
import { getSocket } from "@/lib/socket"
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

export function useInbox() {
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
  const [statusFilter, setStatusFilter] = useState<InboxStatusFilter>("all")
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

    const handleHandoffAlert = (data: any) => {
      playAlertSound()
      void loadConversations(true)
    }

    const handleSessionClaimed = (data: any) => {
      void loadConversations(true)
    }

    socket.on("message:new", handleMessageNew)
    socket.on("conversation:updated", handleConversationUpdated)
    socket.on("incoming_handoff_alert", handleHandoffAlert)
    socket.on("session_claimed", handleSessionClaimed)

    return () => {
      socket.off("message:new", handleMessageNew)
      socket.off("conversation:updated", handleConversationUpdated)
      socket.off("incoming_handoff_alert", handleHandoffAlert)
      socket.off("session_claimed", handleSessionClaimed)
    }
  }, [loadConversations, selectedConversation?._id])

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

  const selectConversation = (conversation: ConversationRecord) => {
    setSelectedConversation(conversation)
    router.replace("/dashboard/inbox")
  }

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

  return {
    isLoading,
    isRefreshing,
    loadError,
    selectedConversation,
    messages,
    messagesLoading,
    messagesError,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    takeoverLoading,
    returnToAiLoading,
    actionError,
    agentMessage,
    setAgentMessage,
    agentMessageLoading,
    agentMessageError,
    contact,
    contactLoading,
    noteDraft,
    setNoteDraft,
    noteSaving,
    loadConversations,
    filteredConversations,
    sessionActive,
    groupedMessages,
    selectConversation,
    handleTakeover,
    handleReturnToAi,
    handleSendMessage,
    handleSaveNote,
    displayName,
    canReply: Boolean(canReply),
  }
}
