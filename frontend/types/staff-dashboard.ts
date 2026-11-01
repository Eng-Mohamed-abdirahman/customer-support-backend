export interface StaffDashboardSummary {
  urgentChats: number
  assigned: number
  open: number
  resolved: number
  avgReplySeconds: number
  avgReplyFormatted: string
  rating: number
  followUp: number
}

export interface StaffDashboardResolvedWeeklyItem {
  date: string
  total: number
}

export interface StaffDashboardResponseRow {
  date: string
  minutes: number
}

export interface StaffDashboardCharts {
  resolvedWeekly: StaffDashboardResolvedWeeklyItem[]
  responseRows: StaffDashboardResponseRow[]
  serviceRating: number
}

export interface StaffDashboardPriorityAssignment {
  id: string
  customerName: string
  subject: string
  status: string
  waitTimeMinutes: number
}

export interface StaffDashboardLeaderboardItem {
  rank: number
  name: string
  resolved: number
  successRate: number
}

export interface StaffDashboardLiveUpdate {
  text: string
  time: string
}

export interface StaffDashboardSchedule {
  dateLabel: string
  shiftStart: string
  shiftEnd: string
  remainingShiftMinutes: number
}

export interface StaffDashboardData {
  summary: StaffDashboardSummary
  charts: StaffDashboardCharts
  priorityAssignments: StaffDashboardPriorityAssignment[]
  leaderboard: StaffDashboardLeaderboardItem[]
  liveUpdates: StaffDashboardLiveUpdate[]
  schedule: StaffDashboardSchedule
  notes: string[]
}
