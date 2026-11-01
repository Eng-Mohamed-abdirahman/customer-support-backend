import { createServer } from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initSocketServer } from "./services/socket.service";
import { designLog, maskSecret } from "./utils/design.logger";

import { logWebhookStartupDiagnostics } from "./services/whatsappWebhookStartup.service";

const startServer = async () => {
  await connectDB();
  const httpServer = createServer(app);
  httpServer.setTimeout(5 * 60 * 1000); // 5 min for long-running regenerate requests
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    designLog.info("startup.replicate", {
      token: maskSecret(process.env.REPLICATE_API_TOKEN),
      kontextModel: process.env.REPLICATE_KONTEXT_MODEL || "google/nano-banana",
      visionEnabled: process.env.DESIGN_VISION_ENABLED !== "false",
    });
    void logWebhookStartupDiagnostics();
  });
};

startServer();