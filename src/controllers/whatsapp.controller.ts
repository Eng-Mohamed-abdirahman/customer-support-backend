import { Request, Response } from "express";

const mongoose = require("mongoose");

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { connectWhatsAppSchema } = require("../validators/whatsapp.validator");
const {
  upsertConnection,
  getConnectionByOrganizationId,
  disconnectConnection,
  toConnectionResponse,
} = require("../services/whatsapp.service");

type AuthenticatedUser = {
  _id: string;
  company?: string | null;
  organizationId?: string | null;
};

const resolveOrganizationId = (req: Request): string => {
  const user = (req as any).user as AuthenticatedUser | undefined;
  const organizationId = user?.organizationId ?? user?.company;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const parseConnectPayload = (req: Request) => {
  const parsed = connectWhatsAppSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  return parsed.data;
};

const connectWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const payload = parseConnectPayload(req);

  const connection = await upsertConnection({
    organizationId,
    phoneNumberId: payload.phoneNumberId,
    businessAccountId: payload.businessAccountId,
    accessToken: payload.accessToken,
    verifyToken: payload.verifyToken,
  });

  apiResponse(res, 200, "WhatsApp connection saved", {
    connection: toConnectionResponse(connection),
  });
});

const getWhatsAppStatus = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const connection = await getConnectionByOrganizationId(organizationId);

  if (!connection) {
    apiResponse(res, 200, "WhatsApp connection status", {
      connection: {
        organizationId,
        status: "disconnected",
      },
    });
    return;
  }

  apiResponse(res, 200, "WhatsApp connection status", {
    connection: toConnectionResponse(connection),
  });
});

const disconnectWhatsApp = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const connection = await disconnectConnection(organizationId);

  if (!connection) {
    throw new AppError("WhatsApp connection not found", 404);
  }

  apiResponse(res, 200, "WhatsApp connection disconnected", {
    connection: toConnectionResponse(connection),
  });
});

module.exports = {
  connectWhatsApp,
  getWhatsAppStatus,
  disconnectWhatsApp,
};

export {};
