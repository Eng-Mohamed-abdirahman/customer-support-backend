import "dotenv/config";

export const env = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/support-saas",
  JWT_SECRET: process.env.JWT_SECRET || "supersecret",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  HF_TOKEN: process.env.HF_TOKEN || "",
  HF_EMBEDDING_MODEL: process.env.HF_EMBEDDING_MODEL || "google/embeddinggemma-300m",
  HF_PROVIDER: process.env.HF_PROVIDER || "hf-inference",
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || "",
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || "",
  PINECONE_INDEX_HOST: process.env.PINECONE_INDEX_HOST || "",
  WHATSAPP_GRAPH_BASE_URL: process.env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com",
  WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION || "v20.0",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  INVITATION_JWT_SECRET:
    process.env.INVITATION_JWT_SECRET || process.env.JWT_SECRET || "supersecret",
  INVITATION_EXPIRES_IN: process.env.INVITATION_EXPIRES_IN || "24h",
  INVITATION_JWT_ISSUER: process.env.INVITATION_JWT_ISSUER || "supportly-api",
  INVITATION_JWT_AUDIENCE:
    process.env.INVITATION_JWT_AUDIENCE || "supportly-organization-onboarding",
  NODE_ENV: process.env.NODE_ENV || "development",
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@ethereal.email',
      pass: process.env.EMAIL_PASS || 'your-password',
    },
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  }
};
