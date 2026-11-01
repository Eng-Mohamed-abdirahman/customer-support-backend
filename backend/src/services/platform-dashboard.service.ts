import mongoose from "mongoose";

import Organization from "../models/Organization";
import Ticket from "../models/Ticket";
import Conversation from "../models/Conversation";
import Message from "../models/Message";
import User from "../models/User";

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getPlatformDashboardStats() {
  const now = new Date();
  const sevenDaysAgo = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [
    activeOrganizations,
    trialingOrganizations,
    suspendedOrganizations,
    openTickets,
    pendingTickets,
    resolvedTickets,
    urgentTickets,
    followUpOrganizations,
  ] = await Promise.all([
    Organization.countDocuments({ status: "active" }),
    Organization.countDocuments({ status: "trialing" }),
    Organization.countDocuments({ status: "suspended" }),
    Ticket.countDocuments({ status: "open" }),
    Ticket.countDocuments({ status: "pending" }),
    Ticket.countDocuments({
      status: "closed",
      updatedAt: { $gte: sevenDaysAgo, $lte: now },
    }),
    Ticket.countDocuments({
      status: { $in: ["open", "pending"] },
      updatedAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Organization.countDocuments({ status: { $in: ["trialing", "suspended"] } }),
  ]);

  const recentConversations = await Conversation.find({
    lastMessageAt: { $gte: sevenDaysAgo, $lte: now },
  }).select("_id");

  const conversationIds = recentConversations.map((c: any) => c._id);
  let averageReplySeconds = 0;

  if (conversationIds.length > 0) {
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      createdAt: { $gte: sevenDaysAgo, $lte: now },
    }).sort({ createdAt: 1 });

    const grouped = new Map<string, any[]>();
    messages.forEach((msg: any) => {
      const key = String(msg.conversationId);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(msg);
    });

    let totalMs = 0;
    let count = 0;
    grouped.forEach((items) => {
      let customerAt: number | null = null;
      for (const msg of items) {
        if (msg.senderType === "customer") {
          customerAt = new Date(msg.createdAt).getTime();
          continue;
        }
        if ((msg.senderType === "agent" || msg.senderType === "assistant") && customerAt !== null) {
          const replyAt = new Date(msg.createdAt).getTime();
          totalMs += Math.max(0, replyAt - customerAt);
          count++;
          customerAt = null;
        }
      }
    });
    averageReplySeconds = count > 0 ? Math.round(totalMs / count / 1000) : 0;
  }

  const ratingAgg = await Conversation.aggregate([
    {
      $match: {
        updatedAt: { $gte: sevenDaysAgo, $lte: now },
        "metadata.customer.rating": { $exists: true },
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$metadata.customer.rating" },
      },
    },
  ]);

  const rating = ratingAgg.length > 0 ? Number(ratingAgg[0].average || 0) : 0;

  const resolvedDailyAgg = await Ticket.aggregate([
    {
      $match: {
        status: "closed",
        updatedAt: { $gte: sevenDaysAgo, $lte: now },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const resolvedMap = new Map<string, number>();
  resolvedDailyAgg.forEach((row: any) => resolvedMap.set(row._id, row.total || 0));

  const resolvedWeekly = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(sevenDaysAgo);
    date.setDate(sevenDaysAgo.getDate() + index);
    const key = dayKey(date);
    return {
      date: key,
      total: resolvedMap.get(key) ?? 0,
    };
  });

  const responseRows = resolvedWeekly.slice(0, 4).map((row) => ({
    date: row.date,
    minutes: Math.max(1, Math.round((averageReplySeconds / 60 || 1) + row.total * 0.2)),
  }));

  const priorityTicketsRaw = await Ticket.find({
    status: { $in: ["open", "pending"] },
  })
    .sort({ updatedAt: -1 })
    .limit(6)
    .select("_id organizationId customerName title status updatedAt");

  const orgIds = [
    ...new Set(
      priorityTicketsRaw
        .map((t: any) => (t.organizationId ? String(t.organizationId) : null))
        .filter(Boolean)
    ),
  ];

  const orgs = await Organization.find({ _id: { $in: orgIds } }).select("profile.name slug");
  const orgMap = new Map<string, any>();
  orgs.forEach((org: any) => orgMap.set(String(org._id), org));

  const priorityAssignments = priorityTicketsRaw.map((ticket: any) => {
    const org = orgMap.get(String(ticket.organizationId));
    const waitTimeMinutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / 60000)
    );
    return {
      id: String(ticket._id),
      customerName: ticket.customerName || org?.profile?.name || "Tenant",
      subject: ticket.title || "Platform support request",
      status: ticket.status,
      waitTimeMinutes,
      organizationName: org?.profile?.name || "Unknown org",
    };
  });

  const orgLeaderboardAgg = await Ticket.aggregate([
    {
      $match: {
        status: "closed",
        updatedAt: { $gte: sevenDaysAgo, $lte: now },
      },
    },
    {
      $group: {
        _id: "$organizationId",
        resolved: { $sum: 1 },
      },
    },
    { $sort: { resolved: -1 } },
    { $limit: 3 },
  ]);

  const leaderboardOrgIds = orgLeaderboardAgg.map((item: any) => item._id).filter(Boolean);
  const leaderboardOrgs = await Organization.find({ _id: { $in: leaderboardOrgIds } }).select(
    "profile.name slug status"
  );
  const leaderboardOrgMap = new Map<string, any>();
  leaderboardOrgs.forEach((org: any) => leaderboardOrgMap.set(String(org._id), org));

  const leaderboard = orgLeaderboardAgg.map((item: any, index: number) => {
    const org = leaderboardOrgMap.get(String(item._id));
    const name = org?.profile?.name || org?.slug || "Organization";
    const successRate = Math.max(65, Math.min(99, 70 + item.resolved * 2));
    return {
      rank: index + 1,
      name,
      resolved: item.resolved || 0,
      successRate,
    };
  });

  const liveUpdates = [
    ...priorityAssignments.slice(0, 2).map((item: any) => ({
      text:
        item.status === "pending"
          ? `Pending ticket for ${item.organizationName}`
          : `New open ticket for ${item.organizationName}`,
      time: `${Math.max(1, item.waitTimeMinutes)}m ago`,
    })),
    ...(suspendedOrganizations > 0
      ? [
          {
            text: `${suspendedOrganizations} organization(s) suspended and need review`,
            time: "Just now",
          },
        ]
      : []),
  ].slice(0, 3);

  const shiftStart = new Date(todayStart);
  shiftStart.setHours(9, 0, 0, 0);
  const shiftEnd = new Date(todayStart);
  shiftEnd.setHours(17, 0, 0, 0);
  const remainingShiftMinutes = Math.max(0, Math.floor((shiftEnd.getTime() - now.getTime()) / 60000));

  const platformUsers = await User.countDocuments({ role: "admin" });

  return {
    summary: {
      urgentChats: urgentTickets,
      assigned: activeOrganizations,
      open: openTickets,
      resolved: resolvedTickets,
      avgReplySeconds: averageReplySeconds,
      avgReplyFormatted: formatSeconds(averageReplySeconds),
      rating: Number(rating.toFixed(1)),
      followUp: followUpOrganizations,
      trialingOrganizations,
      suspendedOrganizations,
      platformUsers,
      pendingTickets,
    },
    charts: {
      resolvedWeekly,
      responseRows,
      serviceRating: Number(rating.toFixed(1)),
    },
    priorityAssignments,
    leaderboard,
    liveUpdates,
    schedule: {
      dateLabel: now.toISOString().slice(0, 10),
      shiftStart: "09:00",
      shiftEnd: "17:00",
      remainingShiftMinutes,
    },
    notes: [
      `${trialingOrganizations} tenant(s) currently in trial.`,
      `${platformUsers} platform admin account(s) active.`,
      suspendedOrganizations > 0
        ? `${suspendedOrganizations} tenant(s) require suspension review.`
        : "All tenants are in good standing.",
    ],
  };
}
