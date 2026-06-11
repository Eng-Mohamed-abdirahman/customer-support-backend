import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const parseCsv = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const assertStrongSecret = (name: string, value: string) => {
  if (!IS_PRODUCTION) {
    return;
  }

  if (!value || value.length < 32) {
    throw new Error(`${name} must be set to a 32+ character secret in production`);
  }
};

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const INVITATION_JWT_SECRET = process.env.INVITATION_JWT_SECRET ?? JWT_SECRET;
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? "";

assertStrongSecret("JWT_SECRET", JWT_SECRET);
assertStrongSecret("INVITATION_JWT_SECRET", INVITATION_JWT_SECRET);
assertStrongSecret("WHATSAPP_APP_SECRET", WHATSAPP_APP_SECRET);

if (IS_PRODUCTION && !process.env.WHATSAPP_APP_ID) {
  throw new Error("WHATSAPP_APP_ID must be set in production");
}

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/support-saas",
  JWT_SECRET,
  JWT_ISSUER: process.env.JWT_ISSUER || "supportly-api",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || "supportly-web",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_LLM_MODEL: process.env.OPENAI_LLM_MODEL || "gpt-4o-mini",
  HF_TOKEN: process.env.HF_TOKEN || "",
  HF_EMBEDDING_MODEL: process.env.HF_EMBEDDING_MODEL || "google/embeddinggemma-300m",
  HF_PROVIDER: process.env.HF_PROVIDER || "hf-inference",
  HF_LLM_MODEL: process.env.HF_LLM_MODEL || "mistralai/Mistral-7B-Instruct-v0.3",
  HF_LLM_PROVIDER: process.env.HF_LLM_PROVIDER || "",
  COHERE_API_KEY: process.env.COHERE_API_KEY || "",
  COHERE_RERANK_MODEL: process.env.COHERE_RERANK_MODEL || "rerank-english-v3.0",
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || "",
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || "",
  PINECONE_INDEX_HOST: process.env.PINECONE_INDEX_HOST || "",
  WHATSAPP_GRAPH_BASE_URL: process.env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com",
  WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION || "v20.0",
  WHATSAPP_APP_ID: process.env.WHATSAPP_APP_ID || "",
  WHATSAPP_APP_SECRET,
  WHATSAPP_OAUTH_REDIRECT_URI: process.env.WHATSAPP_OAUTH_REDIRECT_URI || "",
  WHATSAPP_VERIFY_SIGNATURE: process.env.WHATSAPP_VERIFY_SIGNATURE !== "false",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  INVITATION_JWT_SECRET,
  INVITATION_EXPIRES_IN: process.env.INVITATION_EXPIRES_IN || "24h",
  INVITATION_JWT_ISSUER: process.env.INVITATION_JWT_ISSUER || "supportly-api",
  INVITATION_JWT_AUDIENCE:
    process.env.INVITATION_JWT_AUDIENCE || "supportly-organization-onboarding",
  NODE_ENV,
  ALLOW_PUBLIC_SIGNUP: process.env.ALLOW_PUBLIC_SIGNUP === "true" || NODE_ENV !== "production",
  CORS_ORIGINS: parseCsv(process.env.CORS_ORIGINS),
  email: {
    host: process.env.EMAIL_HOST || "smtp.ethereal.email",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER || "your-email@ethereal.email",
      pass: process.env.EMAIL_PASS || "your-password",
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || "http://localhost:3000",
  },
  B2_ACCESS_KEY_ID: process.env.B2_ACCESS_KEY_ID || "",
  B2_SECRET_ACCESS_KEY: process.env.B2_SECRET_ACCESS_KEY || "",
  B2_REGION: process.env.B2_REGION || "us-west-004",
  B2_S3_ENDPOINT: process.env.B2_S3_ENDPOINT || process.env.B2_ENDPOINT || "",
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME || "",
  B2_PUBLIC_URL_BASE: process.env.B2_PUBLIC_URL_BASE || "",
  publicApiUrl:
    process.env.PUBLIC_API_URL ||
    process.env.WEBHOOK_PUBLIC_URL ||
    `http://localhost:${process.env.PORT || 5000}`,
};
