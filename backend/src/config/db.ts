import mongoose from "mongoose";
import { env } from "./env";
import WhatsAppConnection from "../models/WhatsAppConnection";
import Organization from "../models/Organization";

const syncWhatsAppConnectionIndexes = async () => {

  try {
    await WhatsAppConnection.collection.dropIndex("organizationId_1");
    console.log("Dropped stale unique index on whatsappconnections.organizationId");
  } catch (error: any) {
    if (error?.codeName !== "IndexNotFound" && error?.code !== 27) {
      console.warn("Could not drop organizationId index:", error?.message ?? error);
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
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error: ", error);
    process.exit(1);
  }
};