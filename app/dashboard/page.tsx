"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, RefreshCw } from "lucide-react"
import { MessageSquareText, Clock, BrainCircuit, Users } from "lucide-react"

import { DashboardOverviewHeader } from "@/components/dashboard/header/dashboard-overview-header"
import { KpiCard } from "@/components/dashboard/cards/kpi-card"
import { ConversationTrendChart } from "@/components/dashboard/charts/conversation-trend-chart"
import { ChannelDonutChart } from "@/components/dashboard/charts/channel-donut-chart"
import { TicketStatusChart } from "@/components/dashboard/charts/ticket-status-chart"
import { StaffPerformanceChart } from "@/components/dashboard/charts/staff-performance-chart"
import { RecentConversationsTable } from "@/components/dashboard/tables/recent-conversations-table"
import { AiResolutionChart } from "@/components/dashboard/charts/ai-resolution-chart"
import { CustomerSatisfaction } from "@/components/dashboard/charts/satisfaction-chart"
import { PeakHoursChart } from "@/components/dashboard/charts/peak-hours-chart"
import { AiKnowledgeCard } from "@/components/dashboard/cards/ai-knowledge-card"
import { Button } from "@/components/ui/button"

import { staggerContainer } from "@/components/dashboard/shared/animations"
import { useDashboard } from "@/hooks/useDashboard"

import type { KpiCardData, ConversationTrendData, ChannelData, TicketStatusData, StaffPerformanceData, RecentConversation } from "@/components/dashboard/cards/types"
import type { DashboardApiResponseData } from "@/types/dashboard"

// ─── Data-mapping helpers ──────────────────────────────────────────────────────

function buildKpiCards(data: DashboardApiResponseData): KpiCardData[] {
  const { overview } = data
  const growthDir = overview.growthPercentage >= 0 ? "up" : "down"
  const growthSign = overview.growthPercentage >= 0 ? "+" : ""

  return [
    {
      id: "conversations",
      title: "Today's Conversations",
      value: overview.todayConversations.toLocaleString(),
      description: `Resolved: ${overview.resolvedToday} | Open: ${overview.openToday}`,
      trend: { value: `${growthSign}${overview.growthPercentage}%`, direction: growthDir },
      progress: Math.min(100, (overview.resolvedToday / Math.max(overview.todayConversations, 1)) * 100),
      icon: MessageSquareText,
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
    },
    {
      id: "response-time",
      title: "Avg. Response Time",
      value: overview.responseTime.formatted,
      description: `${overview.responseTime.change > 0 ? "+" : ""}${overview.responseTime.change}% from last period`,
      trend: {
        value: `${overview.responseTime.change > 0 ? "+" : ""}${overview.responseTime.change}%`,
        direction: overview.responseTime.change <= 0 ? "up" : "down",
      },
      progress: Math.max(0, 100 - Math.min(100, (overview.responseTime.averageSeconds / 300) * 100)),
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      id: "ai-resolution",
      title: "AI Resolution Rate",
      value: `${overview.aiResolution.percentage}%`,
      description: `${overview.aiResolution.aiHandled} AI handled · ${overview.aiResolution.humanHandled} human`,
      trend: { value: `${overview.aiResolution.percentage}%`, direction: "up" },
      progress: overview.aiResolution.percentage,
      icon: BrainCircuit,
      iconColor: "text-violet-600",
      iconBg: "bg-violet-50",
    },
    {
      id: "staff-online",
      title: "Staff Online",
      value: overview.staffOnline.online.toString(),
      description: `${overview.staffOnline.offline} offline`,
      trend: { value: "Live", direction: "neutral" },
      progress: Math.min(
        100,
        (overview.staffOnline.online /
          Math.max(overview.staffOnline.online + overview.staffOnline.offline, 1)) *
          100
      ),
      icon: Users,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
  ]
}

function buildTrendData(data: DashboardApiResponseData): ConversationTrendData[] {
  return data.conversations.map((item) => ({
    name: item.date,
    ai: item.aiHandled,
    human: item.total - item.aiHandled,
  }))
}

function buildChannelData(data: DashboardApiResponseData): ChannelData[] {
  const channelColors: Record<string, string> = {
    website: "#0096c7",
    whatsapp: "#25D366",
    messenger: "#0099FF",
    instagram: "#E1306C",
    api: "#6366f1",
    email: "#f59e0b",
  }

  const { channels } = data
  const entries = Object.entries(channels) as [string, number][]

  return entries
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: channelColors[key] ?? "#94a3b8",
    }))
}

function buildTicketStatusData(data: DashboardApiResponseData): TicketStatusData[] {
  const { ticketStatus } = data
  const total = ticketStatus.total || 1

  const colors: Record<string, string> = {
    resolved: "#10b981",
    pending: "#f59e0b",
    waitingCustomer: "#0096c7",
    escalated: "#ef4444",
    closed: "#94a3b8",
  }

  const labels: Record<string, string> = {
    resolved: "Resolved",
    pending: "Pending",
    waitingCustomer: "Waiting on Customer",
    escalated: "Escalated",
    closed: "Closed",
  }

  return Object.entries(ticketStatus)
    .filter(([key]) => key !== "total")
    .map(([key, value]) => ({
      label: labels[key] ?? key,
      value: value as number,
      total,
      color: colors[key] ?? "#94a3b8",
    }))
}

function buildStaffPerformanceData(data: DashboardApiResponseData): StaffPerformanceData[] {
  return data.staffPerformance.map((staff) => ({
    name: staff.name,
    resolved: staff.resolved,
    pending: staff.open,
    avatar: staff.avatar,
  }))
}

function buildRecentConversations(data: DashboardApiResponseData): RecentConversation[] {
  return data.recentConversations.map((conv) => ({
    id: conv.id,
    customer: conv.customer,
    channel: conv.channel,
    status: conv.status,
    assignedTo: conv.assignedTo,
    time: conv.time,
    subject: conv.subject,
    unreadCount: conv.unreadCount,
    lastMessage: conv.lastMessage,
  })) as RecentConversation[]
}

// ─── Page Component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [range, setRange] = useState("7d")
  const { data, isLoading, isFetching, isError, error, refetch } = useDashboard(range)

  // Memoized transforms so re-renders are cheap
  const kpiCards = useMemo(() => (data ? buildKpiCards(data) : []), [data])
  const trendData = useMemo(() => (data ? buildTrendData(data) : []), [data])
  const channelData = useMemo(() => (data ? buildChannelData(data) : []), [data])
  const ticketStatusData = useMemo(() => (data ? buildTicketStatusData(data) : []), [data])
  const staffPerformanceData = useMemo(() => (data ? buildStaffPerformanceData(data) : []), [data])
  const recentConversations = useMemo(() => (data ? buildRecentConversations(data) : []), [data])

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header */}
      <DashboardOverviewHeader
        range={range}
        onRangeChange={setRange}
        isFetching={isFetching}
        onRefresh={refetch}
        tenantName={undefined}
      />

      {/* 2. Error Banner */}
      <AnimatePresence>
        {isError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 text-rose-700"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm font-medium">
                {error?.message ?? "Failed to load dashboard data."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 gap-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. KPI Cards Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <KpiCard key={idx} index={idx} isLoading />
            ))
          : kpiCards.map((card, idx) => (
              <KpiCard key={card.id} data={card} index={idx} />
            ))}
      </motion.div>

      {/* 4. Conversation Trend + Channel Distribution */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ConversationTrendChart data={trendData} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-4">
          <ChannelDonutChart data={channelData} isLoading={isLoading} />
        </div>
      </div>

      {/* 5. Ticket Status + Staff Performance */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <TicketStatusChart data={ticketStatusData} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-6">
          <StaffPerformanceChart data={staffPerformanceData} isLoading={isLoading} />
        </div>
      </div>

      {/* 6. Recent Conversations + AI Resolution */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <RecentConversationsTable data={recentConversations} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-4">
          <AiResolutionChart
            rate={data?.aiResolution?.percentage ?? 0}
            aiCount={data?.aiResolution?.aiHandled ?? 0}
            humanCount={data?.aiResolution?.humanHandled ?? 0}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 7. Satisfaction + Peak Hours + AI Knowledge */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CustomerSatisfaction
          score={data?.satisfaction?.average ?? 0}
          totalReviews={data?.satisfaction?.totalReviews ?? 0}
          isLoading={isLoading}
        />
        <PeakHoursChart
          data={data?.peakHours ?? []}
          isLoading={isLoading}
        />
        <AiKnowledgeCard
          data={
            data?.knowledgeUsage
              ? {
                  topFaq: data.knowledgeUsage.topFaq,
                  mostUsefulArticle: data.knowledgeUsage.mostUsefulArticle,
                  mostSearchedTopics: data.knowledgeUsage.mostSearchedTopics,
                  successRate: data.knowledgeUsage.successRate,
                }
              : undefined
          }
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
