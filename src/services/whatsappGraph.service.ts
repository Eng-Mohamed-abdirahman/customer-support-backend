import { env } from "../config/env";
import { AppError } from "../utils/appError";

const graphBaseUrl = env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com";
const graphVersion = env.WHATSAPP_GRAPH_VERSION || "v20.0";

const buildGraphUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${graphBaseUrl}/${graphVersion}/${normalizedPath}`;
};

const fetchJson = async (url: string, options: any) => {
  const response = await fetch(url, options);
  const text = await response.text();

  if (!response.ok) {
    throw new AppError(`WhatsApp API error: ${text || response.statusText}`, response.status);
  }

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

export const subscribeAppToWaba = async (input: {
  wabaId: string;
  accessToken: string;
}) => {
  const url = buildGraphUrl(`${input.wabaId}/subscribed_apps`);

  return fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
  });
};

export const sendWhatsAppTextMessage = async (input: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  text: string;
}) => {
  const url = buildGraphUrl(`${input.phoneNumberId}/messages`);

  return fetchJson(url, {
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
};
