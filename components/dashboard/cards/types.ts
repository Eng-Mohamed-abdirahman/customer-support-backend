import type { LucideIcon } from "lucide-react"

export type TrendDirection = "up" | "down" | "neutral"

export interface KpiCardData {
  id: string
  title: string
  value: string
  description: string
  trend: {
    value: string
    direction: TrendDirection
  }
  progress: number
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

export interface ConversationTrendData {
  name: string
  ai: number
  human: number
}

export interface ChannelData {
  name: string
  value: number
  color: string
}

export interface TicketStatusData {
  label: string
  value: number
  total: number
  color: string
}

export interface StaffPerformanceData {
  name: string
  resolved: number
  pending: number
  avatar: string
}

export interface RecentConversation {
  id: string
  customer: {
    name: string
    avatar: string
    email: string
  }
  /** All channel values the API may return */
  channel: "email" | "chat" | "website" | "whatsapp" | "phone" | "messenger" | "instagram" | "api" | string
  /** All status values the API may return */
  status: "open" | "pending" | "resolved" | "escalated" | "closed" | string
  assignedTo: string
  time: string
  subject: string
  unreadCount?: number
  lastMessage?: string
}

export interface AiKnowledgeData {
  topFaq: string[]
  mostUsefulArticle: {
    title: string
    views: number
    helpfulRate: number
  }
  mostSearchedTopics: Array<{
    topic: string
    searches: number
  }>
  successRate: number
}

export interface PeakHoursData {
  day: string
  hours: number[]
}
