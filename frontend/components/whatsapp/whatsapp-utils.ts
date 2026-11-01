import { Loader2, Wifi, WifiOff } from "lucide-react"

export const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string; icon: typeof Wifi }> = {
  connected: {
    label: "Connected",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: Wifi,
  },
  disconnected: {
    label: "Disconnected",
    dot: "bg-rose-500",
    bg: "bg-rose-500/10 border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    icon: WifiOff,
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    icon: Loader2,
  },
  error: {
    label: "Error",
    dot: "bg-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    icon: WifiOff,
  },
}

export const webhookStatusConfig: Record<string, { label: string; color: string }> = {
  subscribed: { label: "Subscribed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  failed: { label: "Failed", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  unknown: { label: "Unknown", color: "bg-muted text-muted-foreground border-border/60" },
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export const formatRelative = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMs = Date.now() - date.getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < minute) return "Just now"
  if (diffMs < hour) return `${Math.round(diffMs / minute)}m ago`
  if (diffMs < day) return `${Math.round(diffMs / hour)}h ago`
  return `${Math.round(diffMs / day)}d ago`
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

export type ManualFormState = {
  wabaId: string
  businessName: string
  phoneNumberId: string
  displayPhoneNumber: string
  accessToken: string
  verifyToken: string
}
