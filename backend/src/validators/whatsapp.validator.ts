import { z } from "zod";

const connectWhatsAppSchema = z
  .object({
    wabaId: z.string().trim().min(2, "WABA ID is required"),
    businessName: z.string().trim().optional(),
    phoneNumberId: z.string().trim().min(2, "Phone number ID is required"),
    displayPhoneNumber: z.string().trim().optional(),
    accessToken: z.string().trim().min(10, "Access token is required"),
    verifyToken: z.string().trim().min(6, "Verify token is required"),
  })
  .strict();

const embeddedSignupSchema = z
  .object({
    code: z.string().trim().min(8, "Authorization code is required"),
    redirectUri: z.string().trim().url("Redirect URI is required"),
  })
  .strict();

export {
  connectWhatsAppSchema,
  embeddedSignupSchema,
};

