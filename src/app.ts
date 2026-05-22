import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import { generalApiLimiter } from "./middlewares/rateLimit.middleware";
const invitationRoutes = require("./routes/invitation.routes");
const organizationRoutes = require("./routes/organization.routes");
const knowledgeRoutes = require("./routes/knowledge.routes");
const conversationRoutes = require("./routes/conversation.routes");
const ticketRoutes = require("./routes/ticket.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");
const webhookRoutes = require("./routes/webhook.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

const allowedOrigins =
	env.CORS_ORIGINS.length > 0
		? env.CORS_ORIGINS
		: [env.frontend.url, "https://techcash.vercel.app/"];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) {
				callback(null, true);
				return;
			}

			if (allowedOrigins.includes(origin)) {
				callback(null, true);
				return;
			}

			callback(new Error("Origin not allowed by CORS"));
		},
		credentials: true,
	})
);
app.use(
	helmet({
		crossOriginResourcePolicy: { policy: "same-site" },
	})
);
app.use((req, res, next) => {
	const headerId = req.headers["x-request-id"];
	const requestId = typeof headerId === "string" && headerId.trim() ? headerId : randomUUID();
	(req as any).requestId = requestId;
	res.setHeader("x-request-id", requestId);
	next();
});
app.use(generalApiLimiter);
app.use(
	express.json({
		limit: "1mb",
		verify: (req, _res, buf) => {
			(req as any).rawBody = buf;
		},
	})
);

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