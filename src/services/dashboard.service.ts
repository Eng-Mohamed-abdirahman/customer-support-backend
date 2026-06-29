import mongoose from "mongoose";
import * as queries from "../queries/dashboard.query";

// Simple in-memory cache system mapping organizationId -> { data, expiresAt }
// Mimics Redis caching as requested with 60-second TTL
const cacheStore = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

type DashboardRange = "today" | "7d" | "30d" | "90d";

type DashboardWindow = {
  startDate: Date;
  endDate: Date;
  trendDays: number;
  normalizedRange: DashboardRange;
};

function resolveDashboardWindow(range: string): DashboardWindow {
  const endDate = new Date();
  let normalizedRange: DashboardRange = "7d";
  let trendDays = 7;

  if (range === "today") {
    normalizedRange = "today";
    trendDays = 1;
  } else if (range === "30d") {
    normalizedRange = "30d";
    trendDays = 30;
  } else if (range === "90d") {
    normalizedRange = "90d";
    trendDays = 90;
  }

  const startDate = new Date(endDate);
  if (normalizedRange === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setDate(startDate.getDate() - trendDays);
  }

  return { startDate, endDate, trendDays, normalizedRange };
}

export async function getCompanyDashboardStats(
  organizationIdStr: string,
  range: string = "7d"
) {
  if (!organizationIdStr || !mongoose.Types.ObjectId.isValid(organizationIdStr)) {
    throw new Error("Invalid organization context");
  }

  const organizationId = new mongoose.Types.ObjectId(organizationIdStr);
  const window = resolveDashboardWindow(range);
  const cacheKey = `dashboard:${organizationIdStr}:${window.normalizedRange}`;

  // Check Cache (Redis style)
  const cached = cacheStore.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Resolve calculations in parallel for maximum performance (<300ms)
  const [
    overview,
    responseTime,
    aiResolution,
    staffOnline,
    conversationTrend,
    channels,
    ticketStatus,
    staffPerformance,
    recentConversations,
    satisfaction,
    peakHours,
    knowledgeUsage,
  ] = await Promise.all([
    queries.getOverviewStats(organizationId, window.startDate, window.endDate),
    queries.getAverageResponseTime(organizationId, window.startDate, window.endDate),
    queries.getAiResolution(organizationId, window.startDate, window.endDate),
    queries.getStaffOnline(organizationId),
    queries.getConversationTrend(organizationId, window.startDate, window.endDate, window.trendDays),
    queries.getChannelStats(organizationId, window.startDate, window.endDate),
    queries.getTicketStatus(organizationId, window.startDate, window.endDate),
    queries.getStaffPerformance(organizationId),
    queries.getRecentConversations(organizationId, window.startDate, window.endDate),
    queries.getCustomerSatisfaction(organizationId, window.startDate, window.endDate),
    queries.getPeakHours(organizationId, window.startDate, window.endDate),
    queries.getKnowledgeUsage(organizationId, window.startDate, window.endDate),
  ]);

  const dashboardPayload = {
    overview: {
      ...overview,
      responseTime,
      aiResolution,
      staffOnline,
    },
    conversations: conversationTrend,
    channels,
    ticketStatus,
    staffPerformance,
    recentConversations,
    satisfaction,
    aiResolution,
    peakHours,
    knowledgeUsage,
  };

  // Cache response for 60 seconds
  cacheStore.set(cacheKey, {
    data: dashboardPayload,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return dashboardPayload;
}

export function invalidateDashboardCache(organizationIdStr: string) {
  const prefixes = ["today", "7d", "30d", "90d"];
  prefixes.forEach((pref) => {
    cacheStore.delete(`dashboard:${organizationIdStr}:${pref}`);
  });
}
