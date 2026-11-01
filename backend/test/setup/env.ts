// Runs before any module is imported, so src/config/env.ts sees these values.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-that-is-long-enough-for-tests";
process.env.ENCRYPTION_KEY = "a".repeat(64);
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.WHATSAPP_VERIFY_SIGNATURE = "false";
