import mongoose from "mongoose";
import * as queries from "../queries/dashboard.query";

// Simple in-memory cache system mapping organizationId -> { data, expiresAt }
// Mimics Redis caching as requested with 60-second TTL
const cacheStore = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function getCompanyDashboardStats(
  organizationIdStr: string,
  range: string = "7d"
) {
  if (!organizationIdStr || !mongoose.Types.ObjectId.isValid(organizationIdStr)) {
    throw new Error("Invalid organization context");
  }

  const organizationId = new mongoose.Types.ObjectId(organizationIdStr);
  const cacheKey = `dashboard:${organizationIdStr}:${range}`;

  // Check Cache (Redis style)
  const cached = cacheStore.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  // Determine trend range lookback days
  let trendDays = 7;
  if (range === "30d") trendDays = 30;
  else if (range === "90d") trendDays = 90;
  else if (range === "today") trendDays = 1;

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
    queries.getOverviewStats(organizationId),
    queries.getAverageResponseTime(organizationId),
    queries.getAiResolution(organizationId),
    queries.getStaffOnline(organizationId),
    queries.getConversationTrend(organizationId, trendDays),
    queries.getChannelStats(organizationId),
    queries.getTicketStatus(organizationId),
    queries.getStaffPerformance(organizationId),
    queries.getRecentConversations(organizationId),
    queries.getCustomerSatisfaction(organizationId),
    queries.getPeakHours(organizationId),
    queries.getKnowledgeUsage(organizationId),
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
