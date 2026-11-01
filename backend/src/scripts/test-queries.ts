import mongoose from "mongoose";
import { connectDB } from "../config/db";
import * as queries from "../queries/dashboard.query";

async function run() {
  await connectDB();
  console.log("DB connected successfully");

  const orgId = new mongoose.Types.ObjectId();
  console.log("Testing with random organization ID:", orgId);

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  const trendDays = 7;

  try {
    const overview = await queries.getOverviewStats(orgId, startDate, endDate);
    console.log("overview ok:", overview);

    const responseTime = await queries.getAverageResponseTime(orgId, startDate, endDate);
    console.log("responseTime ok:", responseTime);

    const aiResolution = await queries.getAiResolution(orgId, startDate, endDate);
    console.log("aiResolution ok:", aiResolution);

    const staffOnline = await queries.getStaffOnline(orgId);
    console.log("staffOnline ok:", staffOnline);

    const trend = await queries.getConversationTrend(orgId, startDate, endDate, trendDays);
    console.log("trend ok:", trend);

    const channels = await queries.getChannelStats(orgId, startDate, endDate);
    console.log("channels ok:", channels);

    const tickets = await queries.getTicketStatus(orgId, startDate, endDate);
    console.log("tickets ok:", tickets);

    const performance = await queries.getStaffPerformance(orgId);
    console.log("performance ok:", performance);

    const recent = await queries.getRecentConversations(orgId, startDate, endDate);
    console.log("recent ok:", recent);

    const csat = await queries.getCustomerSatisfaction(orgId, startDate, endDate);
    console.log("csat ok:", csat);

    const peak = await queries.getPeakHours(orgId, startDate, endDate);
    console.log("peak ok:", peak);

    const knowledge = await queries.getKnowledgeUsage(orgId, startDate, endDate);
    console.log("knowledge ok:", knowledge);

    console.log("ALL TESTS COMPLETED SUCCESSFULLY");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
