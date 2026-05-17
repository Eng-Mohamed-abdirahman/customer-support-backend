import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
const invitationRoutes = require("./routes/invitation.routes");
const organizationRoutes = require("./routes/organization.routes");
const knowledgeRoutes = require("./routes/knowledge.routes");
const conversationRoutes = require("./routes/conversation.routes");
const ticketRoutes = require("./routes/ticket.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");
const webhookRoutes = require("./routes/webhook.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(
	cors({
		origin: env.frontend.url,
		credentials: true,
	})
);
app.use(helmet());
app.use(
	rateLimit({
		windowMs: 15 * 60 * 1000,
		max: 300,
		standardHeaders: true,
		legacyHeaders: false,
	})
);
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

export default app;