import mongoose from "mongoose";
import { env } from "./env";
import WhatsAppConnection from "../models/WhatsAppConnection";
import Organization from "../models/Organization";
import { getErrorCode, getErrorMessage } from "../utils/errors";
import { createLogger } from "../utils/logger";

const log = createLogger("Database");

const syncWhatsAppConnectionIndexes = async () => {

  try {
    await WhatsAppConnection.collection.dropIndex("organizationId_1");
    log.info("Dropped stale unique index on whatsappconnections.organizationId");
  } catch (error) {
    if ((error as { codeName?: string })?.codeName !== "IndexNotFound" && getErrorCode(error) !== 27) {
      log.warn("Could not drop organizationId index:", getErrorMessage(error));
    }
  }

  await WhatsAppConnection.syncIndexes();

  const activeConnections = await WhatsAppConnection.find({
    status: { $ne: "disconnected" },
  })
    .select("organizationId")
    .lean();

  const organizationIds = [
    ...new Set(
      activeConnections
        .map((connection: { organizationId?: unknown }) => String(connection.organizationId ?? ""))
        .filter(Boolean)
    ),
  ];

  if (organizationIds.length > 0) {
    await Organization.updateMany(
      { _id: { $in: organizationIds } },
      { $addToSet: { allowedChannels: "whatsapp" } }
    );
  }
};

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    await syncWhatsAppConnectionIndexes();
    log.info("MongoDB Connected");
  } catch (error) {
    log.error("MongoDB Connection Error: ", error);
    process.exit(1);
  }
};