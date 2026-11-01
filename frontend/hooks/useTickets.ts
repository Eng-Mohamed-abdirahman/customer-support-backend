import { useRouter } from "next/navigation"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"

import {
  isValidConversationId,
  playAlertSound,
  type TicketStatusFilter,
} from "@/components/tickets/ticket-utils"
import { getSocket } from "@/lib/socket"
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

export function useTickets() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRecord[]>([])
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("all")
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

    const handleTicketCreated = (payload: TicketRecord) => {
      if (!payload?._id) return

      playAlertSound()

      setTickets((prev) => {
        if (prev.some((t) => t._id === payload._id)) return prev
        return [payload, ...prev]
      })
    }

    const handleIncomingHandoff = () => {
      playAlertSound()
      void loadTickets(true)
    }

    socket.on("message:new", handleMessageNew)
    socket.on("conversation:updated", handleConversationUpdated)
    socket.on("ticket:created", handleTicketCreated)
    socket.on("incoming_handoff_alert", handleIncomingHandoff)

    return () => {
      socket.off("message:new", handleMessageNew)
      socket.off("conversation:updated", handleConversationUpdated)
      socket.off("ticket:created", handleTicketCreated)
      socket.off("incoming_handoff_alert", handleIncomingHandoff)
    }
  }, [selectedTicket?.conversationId, loadTickets])

  /** Navigates to the inbox (WhatsApp) or conversations page for a ticket's conversation. */
  const openTicketConversation = (ticket: TicketRecord) => {
    const conversationId = ticket.conversationId
    if (isValidConversationId(conversationId)) {
      const conv = conversationLookup[conversationId]
      const isWhatsapp = conv
        ? conv.channel === "whatsapp"
        : (ticket.customerPhone && !ticket.customerPhone.startsWith("ip:") && ticket.customerPhone !== "anonymous")

      const customerPhone = conv?.customerPhone || ticket.customerPhone || ""

      if (isWhatsapp) {
        const phone = customerPhone ? customerPhone.replace(/^\+/, "") : ""
        router.push(`/dashboard/inbox?phone=${encodeURIComponent(phone)}`)
      } else {
        router.push(`/dashboard/conversations?id=${encodeURIComponent(conversationId)}`)
      }
    }
  }

  const handleSelectTicket = (ticket: TicketRecord) => {
    setSelectedTicket(ticket)
    setTakeoverError(null)
    setAgentMessageError(null)
    setReturnToAiError(null)
    setStatusUpdateError(null)

    openTicketConversation(ticket)
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

  return {
    isLoading,
    isRefreshing,
    loadError,
    tickets,
    statusFilter,
    setStatusFilter,
    selectedTicket,
    messages,
    messagesLoading,
    messagesError,
    agentMessage,
    setAgentMessage,
    agentMessageLoading,
    agentMessageError,
    takeoverLoading,
    takeoverError,
    returnToAiLoading,
    returnToAiError,
    statusUpdateLoading,
    statusUpdateError,
    loadTickets,
    openTicketConversation,
    handleSelectTicket,
    handleTakeoverConversation,
    handleReturnConversationToAi,
    handleStatusChange,
    handleSendAgentMessage,
    ticketCountLabel,
    selectedConversation,
  }
}
