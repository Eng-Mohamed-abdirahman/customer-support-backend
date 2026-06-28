export interface DashboardOverview {
  todayConversations: number
  resolvedToday: number
  openToday: number
  growthPercentage: number
  responseTime: {
    averageSeconds: number
    formatted: string
    change: number
  }
  aiResolution: {
    percentage: number
    aiHandled: number
    humanHandled: number
  }
  staffOnline: {
    online: number
    offline: number
  }
}

export interface ConversationTrendData {
  date: string
  total: number
  aiHandled: number
}

export interface ChannelStats {
  website: number
  whatsapp: number
  messenger: number
  instagram: number
  api: number
  email: number
}

export interface TicketStatusStats {
  resolved: number
  pending: number
  waitingCustomer: number
  escalated: number
  closed: number
  total: number
}

export interface StaffPerformanceStats {
  name: string
  resolved: number
  avgResponseTime: number
  rating: number
  open: number
  avatar: string
}

export interface RecentConversationCustomer {
  name: string
  avatar: string
  email: string
}

export interface RecentConversation {
  id: string
  customer: RecentConversationCustomer
  channel: string
  status: string
  assignedTo: string
  time: string
  subject: string
  unreadCount: number
  lastMessage: string
}

export interface CustomerSatisfactionStats {
  average: number
  totalReviews: number
}

export interface AiResolutionStats {
  percentage: number
  aiHandled: number
  humanHandled: number
}

export interface AiKnowledgeStats {
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

export interface DashboardApiResponseData {
  overview: DashboardOverview
  conversations: ConversationTrendData[]
  channels: ChannelStats
  ticketStatus: TicketStatusStats
  staffPerformance: StaffPerformanceStats[]
  recentConversations: RecentConversation[]
  satisfaction: CustomerSatisfactionStats
  aiResolution: AiResolutionStats
  peakHours: number[]
  knowledgeUsage: AiKnowledgeStats
}

export interface DashboardApiResponse {
  status: string
  message: string
  data: DashboardApiResponseData
}
