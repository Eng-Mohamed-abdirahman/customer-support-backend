import { createServer } from "http";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initSocketServer } from "./services/socket.service";

const startServer = async () => {
  await connectDB();
  const httpServer = createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
};

startServer();