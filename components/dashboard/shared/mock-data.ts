import {
  MessageSquareText,
  Clock,
  BrainCircuit,
  Users,
} from "lucide-react"
import type {
  KpiCardData,
  ConversationTrendData,
  ChannelData,
  TicketStatusData,
  StaffPerformanceData,
  RecentConversation,
  AiKnowledgeData,
  PeakHoursData,
} from "@/components/dashboard/cards/types"

export const kpiCards: KpiCardData[] = [
  {
    id: "conversations",
    title: "Today's Conversations",
    value: "356",
    description: "Resolved: 298, Open: 58",
    trend: { value: "+12%", direction: "up" },
    progress: 78,
    icon: MessageSquareText,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
  {
    id: "response-time",
    title: "Avg Response Time",
    value: "2m 11s",
    description: "Within SLA target",
    trend: { value: "- 14s", direction: "down" },
    progress: 80,
    icon: Clock,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    id: "ai-resolution",
    title: "AI Resolution Rate",
    value: "81%",
    description: "Automated 288/356 cases",
    trend: { value: "+ 5%", direction: "up" },
    progress: 81,
    icon: BrainCircuit,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
  {
    id: "staff-online",
    title: "Staff Online",
    value: "18",
    description: "Out of 32 total agents",
    trend: { value: "Live", direction: "neutral" },
    progress: 75,
    icon: Users,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
  },
]

export const conversationTrendData: ConversationTrendData[] = [
  { name: "Mon", ai: 320, human: 180 },
  { name: "Tue", ai: 380, human: 210 },
  { name: "Wed", ai: 410, human: 190 },
  { name: "Thu", ai: 450, human: 220 },
  { name: "Fri", ai: 390, human: 200 },
  { name: "Sat", ai: 280, human: 120 },
  { name: "Sun", ai: 240, human: 100 },
]

export const channelData: ChannelData[] = [
  { name: "Chat Widget", value: 42, color: "#0096c7" },
  { name: "WhatsApp", value: 28, color: "#25D366" },
  { name: "Email", value: 18, color: "#023e8a" },
  { name: "Phone", value: 12, color: "#f59e0b" },
]

export const ticketStatusData: TicketStatusData[] = [
  { label: "RESOLVED", value: 72, total: 100, color: "#10b981" },
  { label: "PENDING", value: 18, total: 100, color: "#f59e0b" },
  { label: "WAITING CUSTOMER", value: 7, total: 100, color: "#0096c7" },
  { label: "ESCALATED", value: 3, total: 100, color: "#ef4444" },
]

export const staffPerformanceData: StaffPerformanceData[] = [
  { name: "Ahmed", resolved: 245, pending: 0, avatar: "AH" },
  { name: "Mohamed", resolved: 221, pending: 0, avatar: "MH" },
  { name: "Ali", resolved: 193, pending: 0, avatar: "AL" },
  { name: "Asha", resolved: 150, pending: 0, avatar: "AS" },
]

export const recentConversations: RecentConversation[] = [
  {
    id: "conv-001",
    customer: {
      name: "Sarah Jenkins",
      avatar: "SJ",
      email: "sarah.j@acme.co",
    },
    channel: "whatsapp",
    status: "resolved",
    assignedTo: "AI Support",
    time: "2m ago",
    subject: "Billing inquiry",
  },
  {
    id: "conv-002",
    customer: {
      name: "David Miller",
      avatar: "DM",
      email: "david.m@globex.io",
    },
    channel: "chat", // matches WEBSITE label
    status: "pending",
    assignedTo: "Ahmed",
    time: "5m ago",
    subject: "Website integration issue",
  },
  {
    id: "conv-003",
    customer: {
      name: "Elena Rodriguez",
      avatar: "ER",
      email: "elena.r@initech.com",
    },
    channel: "chat", // We will render as Instagram based on the text matching in the table
    status: "resolved",
    assignedTo: "AI Support",
    time: "12m ago",
    subject: "Instagram webhook",
  },
]

export const aiKnowledgeData: AiKnowledgeData = {
  topFaq: [
    "How do I reset my password?",
    "What are the API rate limits?",
    "How to configure WhatsApp integration?",
    "Billing cycle and payment methods",
    "How to export conversation history?",
  ],
  mostUsefulArticle: {
    title: "Getting Started with Technov API",
    views: 2847,
    helpfulRate: 94,
  },
  mostSearchedTopics: [
    { topic: "API Authentication", searches: 342 },
    { topic: "Webhook Setup", searches: 281 },
    { topic: "Custom Branding", searches: 198 },
    { topic: "Team Permissions", searches: 167 },
  ],
  successRate: 91,
}

export const peakHoursData: PeakHoursData[] = [
  { day: "Mon", hours: [2, 5, 12, 28, 45, 62, 78, 85, 72, 58, 42, 30, 48, 65, 70, 55, 38, 22, 15, 8, 4, 3, 2, 1] },
  { day: "Tue", hours: [1, 3, 8, 22, 38, 55, 72, 80, 68, 52, 45, 35, 52, 68, 75, 60, 42, 28, 18, 10, 5, 3, 2, 1] },
  { day: "Wed", hours: [2, 4, 10, 25, 42, 58, 75, 88, 78, 60, 48, 38, 55, 72, 80, 62, 45, 30, 20, 12, 6, 4, 2, 1] },
  { day: "Thu", hours: [1, 3, 8, 20, 35, 52, 70, 82, 72, 55, 42, 32, 50, 65, 72, 58, 40, 25, 16, 9, 5, 3, 2, 1] },
  { day: "Fri", hours: [2, 4, 10, 24, 40, 58, 72, 78, 65, 50, 38, 28, 42, 58, 65, 52, 35, 22, 14, 8, 4, 3, 2, 1] },
  { day: "Sat", hours: [1, 2, 4, 8, 15, 22, 30, 35, 30, 25, 20, 15, 18, 22, 28, 22, 15, 10, 6, 4, 3, 2, 1, 1] },
  { day: "Sun", hours: [1, 1, 3, 6, 10, 18, 25, 28, 24, 20, 16, 12, 15, 20, 24, 18, 12, 8, 5, 3, 2, 1, 1, 1] },
]
