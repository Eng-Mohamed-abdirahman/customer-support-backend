import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";
import { generalApiLimiter } from "./middlewares/rateLimit.middleware";
import invitationRoutes from "./routes/invitation.routes";
import organizationRoutes from "./routes/organization.routes";
import knowledgeRoutes from "./routes/knowledge.routes";
import conversationRoutes from "./routes/conversation.routes";
import ticketRoutes from "./routes/ticket.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import webhookRoutes from "./routes/webhook.routes";
import { verifyWhatsAppWebhook, receiveWhatsAppWebhook } from "./controllers/webhook.controller";
import { webhookLimiter } from "./middlewares/rateLimit.middleware";
import { verifyWhatsAppSignature } from "./middlewares/whatsappSignature.middleware";
import aiRoutes from "./routes/ai.routes";
import orderRoutes from "./routes/order.routes";
import contactRoutes from "./routes/contact.routes";
import designRoutes from "./routes/design.routes";
import inngestRoutes from "./routes/inngest.routes";
import brandRoutes from "./routes/brand.routes";
import storageRoutes from "./routes/storage.routes";
import supportRoutes from "./routes/support.routes";
import planRoutes from "./routes/plan.routes";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Endpoints that customers' own websites call with an API key, so any origin may reach them.
const PUBLIC_API_PATHS = [
	"/api/health",
	"/api/conversations/ask",
	"/api/ai/",
	"/api/tickets",
	"/api/designs",
	"/api/support/escalate",
];

const dashboardOrigins = new Set([env.frontend.url, ...env.CORS_ORIGINS].filter(Boolean));
const allowAnyDashboardOrigin = !env.IS_PRODUCTION && env.CORS_ORIGINS.length === 0;

app.use(
	cors((req, callback) => {
		const path = req.url ?? "";
		const origin = req.headers.origin;
		const isPublic = PUBLIC_API_PATHS.some((prefix) => path.startsWith(prefix));
		const allowed = isPublic || allowAnyDashboardOrigin || (origin ? dashboardOrigins.has(origin) : true);

		callback(null, {
			origin: allowed ? (isPublic ? "*" : origin || false) : false,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "x-organization-id"],
		});
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
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/plans", planRoutes);
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
app.use("/api/support", supportRoutes);

app.use(errorHandler);

export default app;