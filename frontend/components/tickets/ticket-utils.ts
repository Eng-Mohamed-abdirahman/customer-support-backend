import type { TicketStatus } from "@/types/ticket"

export const statusFilters: Array<TicketStatus | "all"> = ["all", "open", "pending", "closed"]

export type TicketStatusFilter = (typeof statusFilters)[number]

export const formatDateTime = (value?: string) => {
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

export const getStatusTone = (status: TicketStatus) => {
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

export const playAlertSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = "sine"
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio not available
  }
}

export const messageBubbleStyles: Record<string, string> = {
  customer: "border-primary/30 bg-primary text-primary-foreground",
  assistant: "border-border/60 bg-card text-foreground",
  agent: "border-emerald-500/30 bg-emerald-500/10 text-foreground",
  system: "border-amber-500/30 bg-amber-500/10 text-foreground",
}

export const formatChannelLabel = (channel?: string) => {
  if (!channel) {
    return "-"
  }

  return channel.charAt(0).toUpperCase() + channel.slice(1)
}

export const formatSessionId = (value?: string | null) => {
  if (!value || value === "null") {
    return "-"
  }

  return `#SESS-${value.slice(-4).toUpperCase()}`
}

export const isValidConversationId = (value?: string | null): value is string => Boolean(value && value !== "null")
