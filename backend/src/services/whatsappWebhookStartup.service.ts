const { env } = require("../config/env");
const { whatsappLog } = require("../utils/whatsappLogger");
const {
  buildCallbackUrl,
  isPublicCallbackUrl,
  repairWabaSubscriptionsForActiveConnections,
} = require("./whatsappWebhookSetup.service");
const { getAppWebhookSubscriptions } = require("./whatsappGraph.service");

const probeUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url.replace(/\/api\/webhooks\/whatsapp\/?$/, "/api/health"), {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
};

const logWebhookStartupDiagnostics = async () => {
  const callbackUrl = buildCallbackUrl();
  const callbackIsPublic = isPublicCallbackUrl(callbackUrl);

  whatsappLog.info("WEBHOOK_DIAG", "Inbound webhook configuration", {
    publicApiUrl: env.publicApiUrl,
    callbackUrl,
    callbackIsPublic,
  });

  if (!callbackIsPublic) {
    console.warn(
      "\n[WhatsApp] ⚠️  PUBLIC_API_URL is localhost — Meta cannot deliver inbound WhatsApp messages to this machine.\n" +
        "   Fix: run `ngrok http 5000`, set PUBLIC_API_URL=https://YOUR-NGROK-URL in backend/.env, restart, then click\n" +
        "   \"Enable inbound messages\" in Dashboard → WhatsApp settings.\n"
    );
    return;
  }

  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    console.warn(
      "\n[WhatsApp] ⚠️  WHATSAPP_APP_ID / WHATSAPP_APP_SECRET missing — cannot verify Meta webhook subscription.\n"
    );
    return;
  }

  try {
    const meta = await getAppWebhookSubscriptions();
    const metaCallbackUrl = meta.callbackUrl ?? "(not set)";
    const urlsMatch = metaCallbackUrl === callbackUrl;
    const metaReachable = metaCallbackUrl.startsWith("http")
      ? await probeUrl(metaCallbackUrl)
      : false;
    const localReachable = await probeUrl(callbackUrl);

    whatsappLog.info("WEBHOOK_DIAG", "Meta webhook subscription status", {
      metaCallbackUrl,
      messagesSubscribed: meta.messagesSubscribed,
      subscribedFields: meta.fields,
      urlsMatch,
      metaCallbackReachable: metaReachable,
      configuredCallbackReachable: localReachable,
    });

    if (!meta.messagesSubscribed) {
      console.warn(
        "\n[WhatsApp] ⚠️  Meta app is not subscribed to the \"messages\" webhook field.\n" +
          "   Fix: Dashboard → WhatsApp → click \"Enable inbound messages\".\n"
      );
    }

    if (!urlsMatch) {
      console.warn(
        `\n[WhatsApp] ⚠️  Meta webhook URL mismatch!\n` +
          `   Meta sends to:  ${metaCallbackUrl}\n` +
          `   Your app uses:  ${callbackUrl}\n` +
          `   Fix: set PUBLIC_API_URL to the URL Meta should use, restart backend, then click\n` +
          `   \"Enable inbound messages\" to sync Meta with your server.\n`
      );
    }

    if (!metaReachable && metaCallbackUrl.startsWith("http")) {
      console.warn(
        `\n[WhatsApp] ⚠️  Meta webhook URL is not reachable: ${metaCallbackUrl}\n` +
          `   Inbound WhatsApp messages will NOT arrive until this URL is online.\n` +
          `   If using ngrok, start it again (\`ngrok http 5000\`) — free ngrok URLs change every restart.\n`
      );
    }

    const wabaRepair = await repairWabaSubscriptionsForActiveConnections();
    const brokenWabas = wabaRepair.filter((item: any) => item.status === "failed");
    const repairedWabas = wabaRepair.filter((item: any) => item.status === "repaired");

    if (repairedWabas.length > 0) {
      whatsappLog.info("WEBHOOK_DIAG", "Auto-repaired missing WABA webhook subscriptions", {
        repairedWabas,
      });
      console.log(
        `\n[WhatsApp] ✓ Auto-subscribed your Meta app to WABA(s): ${repairedWabas.map((w: any) => w.wabaId).join(", ")}\n` +
          `   Try sending a WhatsApp message to your business number now.\n`
      );
    }

    if (brokenWabas.length > 0) {
      console.warn(
        `\n[WhatsApp] ⚠️  Could not subscribe app to WABA(s): ${brokenWabas.map((w: any) => w.wabaId).join(", ")}\n` +
          `   Click \"Enable inbound messages\" in Dashboard → WhatsApp settings.\n`
      );
    }
  } catch (error: any) {
    whatsappLog.warn("WEBHOOK_DIAG", "Could not read Meta webhook subscription", {
      error: String(error?.message ?? error),
    });
  }
};

module.exports = {
  logWebhookStartupDiagnostics,
  probeUrl,
};

export {};
