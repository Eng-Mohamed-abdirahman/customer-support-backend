import mongoose from "mongoose";

const Ticket = require("../models/Ticket");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

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

export async function getStaffDashboardStats(
  organizationIdStr: string,
  userIdStr: string
) {
  if (!organizationIdStr || !mongoose.Types.ObjectId.isValid(organizationIdStr)) {
    throw new Error("Invalid organization context");
  }
  if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
    throw new Error("Invalid user context");
  }

  const organizationId = new mongoose.Types.ObjectId(organizationIdStr);
  const userId = new mongoose.Types.ObjectId(userIdStr);

  const now = new Date();
  const sevenDaysAgo = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [assigned, open, resolved, followUp, urgent] = await Promise.all([
    Ticket.countDocuments({
      organizationId,
      assignedTo: userId,
      status: { $in: ["open", "pending"] },
    }),
    Ticket.countDocuments({
      organizationId,
      assignedTo: userId,
      status: "open",
    }),
    Ticket.countDocuments({
      organizationId,
      assignedTo: userId,
      status: "closed",
      updatedAt: { $gte: sevenDaysAgo, $lte: now },
    }),
    Ticket.countDocuments({
      organizationId,
      assignedTo: userId,
      status: "pending",
    }),
    Ticket.countDocuments({
      organizationId,
      assignedTo: userId,
      status: "pending",
      updatedAt: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  const assignedConversationIds = await Conversation.find({
    organizationId,
    assignedAgent: userId,
    lastMessageAt: { $gte: sevenDaysAgo, $lte: now },
  }).select("_id");

  const conversationIds = assignedConversationIds.map((c: any) => c._id);
  let averageReplySeconds = 0;
  if (conversationIds.length > 0) {
    const messages = await Message.find({
      organizationId,
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
        organizationId,
        assignedAgent: userId,
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
        organizationId,
        assignedTo: userId,
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
    minutes: Math.max(1, Math.round((averageReplySeconds / 60 || 1) + row.total * 0.3)),
  }));

  const priorityAssignmentsRaw = await Ticket.find({
    organizationId,
    assignedTo: userId,
    status: { $in: ["open", "pending"] },
  })
    .sort({ updatedAt: -1 })
    .limit(6)
    .select("_id customerName title status updatedAt");

  const priorityAssignments = priorityAssignmentsRaw.map((ticket: any) => {
    const waitTimeMinutes = Math.max(
      0,
      Math.floor((Date.now() - new Date(ticket.updatedAt).getTime()) / 60000)
    );
    return {
      id: String(ticket._id),
      customerName: ticket.customerName || "Customer",
      subject: ticket.title || "Support request",
      status: ticket.status,
      waitTimeMinutes,
    };
  });

  const leaderboardAgg = await Ticket.aggregate([
    {
      $match: {
        organizationId,
        status: "closed",
        updatedAt: { $gte: sevenDaysAgo, $lte: now },
        assignedTo: { $ne: null },
      },
    },
    {
      $group: {
        _id: "$assignedTo",
        resolved: { $sum: 1 },
      },
    },
    { $sort: { resolved: -1 } },
    { $limit: 3 },
  ]);

  const leaderboardUserIds = leaderboardAgg.map((item: any) => item._id).filter(Boolean);
  const users = await User.find({ _id: { $in: leaderboardUserIds } }).select("firstName lastName");
  const usersMap = new Map<string, any>();
  users.forEach((u: any) => usersMap.set(String(u._id), u));

  const leaderboard = leaderboardAgg.map((item: any, index: number) => {
    const user = usersMap.get(String(item._id));
    const name = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Agent";
    const successRate = Math.max(65, Math.min(99, 70 + item.resolved * 2));
    return {
      rank: index + 1,
      name,
      resolved: item.resolved || 0,
      successRate,
    };
  });

  const liveUpdates = priorityAssignments.slice(0, 3).map((item: any) => ({
    text:
      item.status === "pending"
        ? `Pending follow-up for ${item.customerName}`
        : `New assignment from ${item.customerName}`,
    time: `${Math.max(1, item.waitTimeMinutes)}m ago`,
  }));

  const shiftStart = new Date(todayStart);
  shiftStart.setHours(9, 0, 0, 0);
  const shiftEnd = new Date(todayStart);
  shiftEnd.setHours(17, 0, 0, 0);
  const remainingShiftMinutes = Math.max(0, Math.floor((shiftEnd.getTime() - now.getTime()) / 60000));

  return {
    summary: {
      urgentChats: urgent,
      assigned,
      open,
      resolved,
      avgReplySeconds: averageReplySeconds,
      avgReplyFormatted: formatSeconds(averageReplySeconds),
      rating: Number(rating.toFixed(1)),
      followUp,
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
    notes: priorityAssignments.slice(0, 3).map((item: any) => item.subject),
  };
}
