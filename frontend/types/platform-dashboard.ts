export interface PlatformDashboardSummary {
  urgentChats: number
  assigned: number
  open: number
  resolved: number
  avgReplySeconds: number
  avgReplyFormatted: string
  rating: number
  followUp: number
  trialingOrganizations: number
  suspendedOrganizations: number
  platformUsers: number
  pendingTickets: number
}

export interface PlatformDashboardResolvedWeeklyItem {
  date: string
  total: number
}

export interface PlatformDashboardResponseRow {
  date: string
  minutes: number
}

export interface PlatformDashboardCharts {
  resolvedWeekly: PlatformDashboardResolvedWeeklyItem[]
  responseRows: PlatformDashboardResponseRow[]
  serviceRating: number
}

export interface PlatformDashboardPriorityAssignment {
  id: string
  customerName: string
  subject: string
  status: string
  waitTimeMinutes: number
  organizationName: string
}

export interface PlatformDashboardLeaderboardItem {
  rank: number
  name: string
  resolved: number
  successRate: number
}

export interface PlatformDashboardLiveUpdate {
  text: string
  time: string
}

export interface PlatformDashboardSchedule {
  dateLabel: string
  shiftStart: string
  shiftEnd: string
  remainingShiftMinutes: number
}

export interface PlatformDashboardData {
  summary: PlatformDashboardSummary
  charts: PlatformDashboardCharts
  priorityAssignments: PlatformDashboardPriorityAssignment[]
  leaderboard: PlatformDashboardLeaderboardItem[]
  liveUpdates: PlatformDashboardLiveUpdate[]
  schedule: PlatformDashboardSchedule
  notes: string[]
}
