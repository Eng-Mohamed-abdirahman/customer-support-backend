import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { whatsappLog } from "../utils/whatsappLogger";

const graphBaseUrl = env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com";
const graphVersion = env.WHATSAPP_GRAPH_VERSION || "v20.0";

const buildGraphUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${graphBaseUrl}/${graphVersion}/${normalizedPath}`;
};

const redactUrl = (url: string) => url.replace(/access_token=[^&]+/gi, "access_token=***");

const fetchJson = async (url: string, options: any) => {
  const method = options?.method ?? "GET";
  const startMs = Date.now();

  whatsappLog.debug("GRAPH_API", "Outgoing Graph API request", {
    method,
    url: redactUrl(url),
  });

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (error: any) {
    whatsappLog.error("GRAPH_API", "Network error calling Graph API", {
      method,
      url: redactUrl(url),
      error: String(error?.message ?? error),
      durationMs: Date.now() - startMs,
    });
    throw error;
  }

  const text = await response.text();
  const durationMs = Date.now() - startMs;

  if (!response.ok) {
    whatsappLog.error("GRAPH_API", "Graph API returned error", {
      method,
      url: redactUrl(url),
      status: response.status,
      statusText: response.statusText,
      responseBody: text.slice(0, 500),
      durationMs,
    });
    throw new AppError(`WhatsApp API error: ${text || response.statusText}`, response.status);
  }

  whatsappLog.info("GRAPH_API", "Graph API request succeeded", {
    method,
    url: redactUrl(url),
    status: response.status,
    durationMs,
    responsePreview: text.slice(0, 200),
  });

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

type ExchangeTokenResult = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

export const exchangeCodeForToken = async (input: {
  code: string;
  redirectUri: string;
}) => {
  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    throw new AppError("WhatsApp OAuth is not configured", 500);
  }

  const url = new URL(`${graphBaseUrl}/${graphVersion}/oauth/access_token`);
  url.searchParams.set("client_id", env.WHATSAPP_APP_ID);
  url.searchParams.set("client_secret", env.WHATSAPP_APP_SECRET);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("code", input.code);

  return fetchJson(url.toString(), { method: "GET" }) as Promise<ExchangeTokenResult>;
};

export const exchangeForLongLivedToken = async (input: { shortLivedToken: string }) => {
  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    throw new AppError("WhatsApp OAuth is not configured", 500);
  }

  const url = new URL(`${graphBaseUrl}/${graphVersion}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.WHATSAPP_APP_ID);
  url.searchParams.set("client_secret", env.WHATSAPP_APP_SECRET);
  url.searchParams.set("fb_exchange_token", input.shortLivedToken);

  return fetchJson(url.toString(), { method: "GET" }) as Promise<ExchangeTokenResult>;
};

export const fetchOwnedWabaAccounts = async (accessToken: string) => {
  const url = buildGraphUrl(
    "me/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{display_phone_number,verified_name,code_verification_status,quality_rating}"
  );

  return fetchJson(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }) as Promise<{ data: Array<any> }>;
};

export const buildAppAccessToken = () => {
  if (!env.WHATSAPP_APP_ID || !env.WHATSAPP_APP_SECRET) {
    throw new AppError("WHATSAPP_APP_ID and WHATSAPP_APP_SECRET are required", 500);
  }

  return `${env.WHATSAPP_APP_ID}|${env.WHATSAPP_APP_SECRET}`;
};

export const subscribeAppWebhookFields = async (input: {
  callbackUrl: string;
  verifyToken: string;
  fields?: string[];
}) => {
  const appAccessToken = buildAppAccessToken();
  const url = `${buildGraphUrl(`${env.WHATSAPP_APP_ID}/subscriptions`)}?access_token=${encodeURIComponent(appAccessToken)}`;
  const fields = (input.fields ?? ["messages"]).join(",");

  whatsappLog.info("WEBHOOK_SETUP", "Subscribing Meta app to webhook fields", {
    callbackUrl: input.callbackUrl,
    fields,
  });

  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      object: "whatsapp_business_account",
      callback_url: input.callbackUrl,
      verify_token: input.verifyToken,
      fields,
    }).toString(),
  });
};

export const getAppWebhookSubscriptions = async () => {
  const appAccessToken = buildAppAccessToken();
  const url = `${buildGraphUrl(`${env.WHATSAPP_APP_ID}/subscriptions`)}?access_token=${encodeURIComponent(appAccessToken)}`;

  const result = (await fetchJson(url, { method: "GET" })) as {
    data?: Array<{
      object?: string;
      callback_url?: string;
      active?: boolean;
      fields?: Array<{ name?: string }>;
    }>;
  };

  const entries = Array.isArray(result?.data) ? result.data : [];
  const wabaSubscription = entries.find((entry) => entry.object === "whatsapp_business_account");
  const fieldNames = Array.isArray(wabaSubscription?.fields)
    ? wabaSubscription.fields.map((field) => String(field?.name ?? "").trim()).filter(Boolean)
    : [];

  return {
    active: Boolean(wabaSubscription?.active),
    callbackUrl: wabaSubscription?.callback_url ?? null,
    fields: fieldNames,
    messagesSubscribed: fieldNames.includes("messages"),
    raw: result,
  };
};

export const getWabaSubscribedApps = async (input: {
  wabaId: string;
  accessToken: string;
}) => {
  const url = buildGraphUrl(`${input.wabaId}/subscribed_apps`);

  const result = (await fetchJson(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })) as { data?: unknown[] };

  const entries = Array.isArray(result?.data) ? result.data : [];

  return {
    subscribed: entries.length > 0,
    count: entries.length,
    raw: result,
  };
};

export const subscribeAppToWaba = async (input: {
  wabaId: string;
  accessToken: string;
}) => {
  const url = buildGraphUrl(`${input.wabaId}/subscribed_apps`);

  whatsappLog.info("WEBHOOK_SETUP", "Subscribing app to WABA", {
    wabaId: input.wabaId,
  });

  return fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
  });
};

export const ensureAppSubscribedToWaba = async (input: {
  wabaId: string;
  accessToken: string;
}) => {
  const before = await getWabaSubscribedApps(input);

  if (before.subscribed) {
    whatsappLog.debug("WEBHOOK_SETUP", "App already subscribed to WABA", {
      wabaId: input.wabaId,
      subscribedAppCount: before.count,
    });
    return { alreadySubscribed: true, ...before };
  }

  whatsappLog.warn("WEBHOOK_SETUP", "App NOT subscribed to WABA — inbound messages will not arrive", {
    wabaId: input.wabaId,
  });

  await subscribeAppToWaba(input);

  const after = await getWabaSubscribedApps(input);
  if (!after.subscribed) {
    throw new AppError(
      `Meta app is still not subscribed to WABA ${input.wabaId}. Inbound WhatsApp messages will not be delivered.`,
      502
    );
  }

  whatsappLog.info("WEBHOOK_SETUP", "App subscribed to WABA successfully", {
    wabaId: input.wabaId,
    subscribedAppCount: after.count,
  });

  return { alreadySubscribed: false, ...after };
};

export const sendWhatsAppTextMessage = async (input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
}) => {
  whatsappLog.info("MESSAGE_SEND", "Sending text message via Graph API (webhook/AI path)", {
    phoneNumberId: input.phoneNumberId,
    to: input.to,
    text: input.text,
    accessToken: input.accessToken,
  });

  const url = buildGraphUrl(`${input.phoneNumberId}/messages`);

  const result = await fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      text: {
        body: input.text,
      },
    }),
  });

  whatsappLog.info("MESSAGE_SEND", "Text message sent successfully (webhook/AI path)", {
    phoneNumberId: input.phoneNumberId,
    to: input.to,
    graphMessageId: (result as any)?.messages?.[0]?.id ?? null,
  });

  return result;
};
