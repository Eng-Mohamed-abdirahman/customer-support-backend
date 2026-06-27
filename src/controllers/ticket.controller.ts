import { Request, Response } from "express";

const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const { emitToOrganization } = require("../services/socket.service");

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const {
  createTicketSchema,
  listTicketsSchema,
  updateTicketStatusSchema,
} = require("../validators/ticket.validator");

type AuthenticatedUser = {
  _id: string;
  role: "admin" | "company-admin" | "staff";
  company?: string | null;
  organizationId?: string | null;
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveOrganizationId = (req: Request): string => {
  const organizationIdFromApiKey = normalizeText((req as any).organizationId);
  if (organizationIdFromApiKey && mongoose.Types.ObjectId.isValid(organizationIdFromApiKey)) {
    return String(organizationIdFromApiKey);
  }

  const requester = (req as any).user as AuthenticatedUser | undefined;
  const organizationId = normalizeText(requester?.organizationId) || normalizeText(requester?.company);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const assertApiKeyRequest = (req: Request) => {
  const organizationIdFromApiKey = normalizeText((req as any).organizationId);
  if (!organizationIdFromApiKey) {
    throw new AppError("API key is required to create tickets", 401);
  }
};

const ensureCanViewTickets = (req: Request) => {
  const requester = (req as any).user as AuthenticatedUser | undefined;

  if (!requester || !requester.role) {
    throw new AppError("Not authorized to view tickets", 401);
  }

  if (requester.role === "staff") {
    throw new AppError("Staff users are not allowed to view tickets", 403);
  }
};

const createTicket = asyncHandler(async (req: Request, res: Response) => {
  assertApiKeyRequest(req);
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const requester = (req as any).user as AuthenticatedUser | undefined;
  const organizationFromApiKey = (req as any).organization as { createdBy?: string } | undefined;
  const createdBy = requester?._id ?? organizationFromApiKey?.createdBy;
  if (!createdBy) {
    throw new AppError("Not authorized to create tickets", 401);
  }

  const organizationId = resolveOrganizationId(req);

  const conversationId = normalizeText(parsed.data.conversationId);
  if (conversationId && !mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError("Conversation not found", 404);
  }

  const customerName = normalizeText(parsed.data.customerName);
  const customerPhone = normalizeText(parsed.data.customerPhone);

  const ticket = await Ticket.create({
    organizationId,
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    conversationId: conversationId || null,
    customerName,
    customerPhone,
    createdBy,
    status: "open",
  });

  apiResponse(res, 201, "Ticket created successfully", {
    ticketId: String(ticket._id),
    status: ticket.status,
  });
});

const listTickets = asyncHandler(async (req: Request, res: Response) => {
  ensureCanViewTickets(req);
  const organizationId = resolveOrganizationId(req);

  const parsed = listTicketsSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const filters: Record<string, any> = { organizationId };
  if (parsed.data.status) {
    filters.status = parsed.data.status;
  }

  const tickets = await Ticket.find(filters)
    .sort({ createdAt: -1 })
    .limit(parsed.data.limit ?? 50)
    .skip(parsed.data.skip ?? 0)
    .lean();

  apiResponse(res, 200, "Tickets retrieved successfully", {
    tickets: tickets.map((ticket: any) => ({
      _id: String(ticket._id),
      conversationId: ticket.conversationId ? String(ticket.conversationId) : null,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      customerName: ticket.customerName ?? "",
      customerPhone: ticket.customerPhone ?? "",
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })),
  });
});

const updateTicketStatus = asyncHandler(async (req: Request, res: Response) => {
  ensureCanViewTickets(req);
  const organizationId = resolveOrganizationId(req);
  const ticketId = normalizeText(req.params?.id);

  if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
    throw new AppError("Ticket not found", 404);
  }

  const parsed = updateTicketStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const ticket = await Ticket.findOne({ _id: ticketId, organizationId });
  if (!ticket) {
    throw new AppError("Ticket not found", 404);
  }

  ticket.status = parsed.data.status;
  await ticket.save();

  try {
    emitToOrganization(organizationId, "ticket:updated", {
      _id: String(ticket._id),
      conversationId: ticket.conversationId ? String(ticket.conversationId) : null,
      status: ticket.status,
    });
  } catch (err) {
    console.error("Failed to emit ticket:updated event:", err);
  }

  apiResponse(res, 200, "Ticket status updated", {
    ticket: {
      _id: String(ticket._id),
      conversationId: ticket.conversationId ? String(ticket.conversationId) : null,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      customerName: ticket.customerName ?? "",
      customerPhone: ticket.customerPhone ?? "",
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    },
  });
});

module.exports = {
  createTicket,
  listTickets,
  updateTicketStatus,
};

export {};
