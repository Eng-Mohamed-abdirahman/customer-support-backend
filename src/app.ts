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
const {
	verifyWhatsAppWebhook,
	receiveWhatsAppWebhook,
} = require("./controllers/webhook.controller");
const { webhookLimiter } = require("./middlewares/rateLimit.middleware");
const { verifyWhatsAppSignature } = require("./middlewares/whatsappSignature.middleware");
const aiRoutes = require("./routes/ai.routes");
const orderRoutes = require("./routes/order.routes");
const contactRoutes = require("./routes/contact.routes");
const designRoutes = require("./routes/design.routes");
const inngestRoutes = require("./routes/inngest.routes");
const brandRoutes = require("./routes/brand.routes");
const storageRoutes = require("./routes/storage.routes");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
	cors({
		origin: "*",
		methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-organization-id"],
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
app.use(
	express.json({
		limit: "1mb",
		verify: (req, _res, buf) => {
			(req as any).rawBody = buf;
		},
	})
);

const logWebhookRequest = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
	const body = (req as any).body;
	const entry = Array.isArray(body?.entry) ? body.entry[0] : null;
	const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
	const value = change?.value ?? {};
	const messageCount = Array.isArray(value?.messages) ? value.messages.length : 0;
	const statusCount = Array.isArray(value?.statuses) ? value.statuses.length : 0;
	const hasSignature = Boolean(req.headers["x-hub-signature-256"]);

	console.log(
		`[Webhook] ${req.method} ${req.originalUrl} messages=${messageCount} statuses=${statusCount} field=${change?.field ?? "-"} signed=${hasSignature}`
	);

	if (req.method === "POST" && messageCount === 0 && statusCount === 0) {
		console.log(
			`[Webhook] POST received but no messages/statuses in payload — check Meta app is subscribed to the "messages" field`
		);
	}

	next();
};

// WhatsApp webhooks must be registered before the general API rate limiter.
app.use("/api/webhooks", logWebhookRequest, webhookRoutes);
app.use("/api/webhook", logWebhookRequest, webhookRoutes);
app.get("/api/whatsapp/webhook", verifyWhatsAppWebhook);
app.post(
	"/api/whatsapp/webhook",
	logWebhookRequest,
	webhookLimiter,
	verifyWhatsAppSignature,
	receiveWhatsAppWebhook
);

app.use(generalApiLimiter);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/designs", designRoutes);
app.use("/api/inngest", inngestRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/storage", storageRoutes);

app.use(errorHandler);

export default app;