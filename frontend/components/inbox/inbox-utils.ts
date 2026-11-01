import type { ConversationMessageRecord } from "@/types/conversation"

export const WHATSAPP_SESSION_MS = 24 * 60 * 60 * 1000
export const statusFilters = ["all", "open", "pending", "closed"] as const

export type InboxStatusFilter = (typeof statusFilters)[number]

export const playAlertSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export const formatTimeAgo = (value?: string) => {
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

export const formatMessageTime = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export const formatDateSeparator = (value?: string) => {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

export const getInitials = (value?: string) => {
  if (!value) return "?"
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export const isWhatsAppSessionActive = (messages: ConversationMessageRecord[]) => {
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
