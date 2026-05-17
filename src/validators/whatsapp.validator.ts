const { z } = require("zod");

const connectWhatsAppSchema = z
  .object({
    phoneNumberId: z.string().trim().min(2, "Phone number ID is required"),
    businessAccountId: z.string().trim().min(2, "Business account ID is required"),
    accessToken: z.string().trim().min(10, "Access token is required"),
    verifyToken: z.string().trim().min(6, "Verify token is required"),
  })
  .strict();

module.exports = {
  connectWhatsAppSchema,
};

export {};
