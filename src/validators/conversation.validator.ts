const { z } = require("zod");

const historyItemSchema = z.object({
  role: z.enum(["customer", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "History message cannot be empty")
    .max(4000, "History message cannot exceed 4000 characters"),
});

const customerContextSchema = z
  .object({
    id: z.string().trim().max(120, "Customer ID cannot exceed 120 characters").optional(),
    name: z.string().trim().max(120, "Customer name cannot exceed 120 characters").optional(),
    email: z.string().trim().email("Invalid customer email").optional(),
  })
  .strict();

const askConversationSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Message is required")
      .max(4000, "Message cannot exceed 4000 characters"),
    channel: z.string().trim().max(80, "Channel cannot exceed 80 characters").optional(),
    topK: z.number().int().min(1).max(10).optional(),
    history: z.array(historyItemSchema).max(12, "History cannot exceed 12 messages").optional(),
    customer: customerContextSchema.optional(),
  })
  .strict();

const listConversationsSchema = z
  .object({
    status: z.enum(["open", "pending", "closed"]).optional(),
    channel: z.string().trim().max(40, "Channel cannot exceed 40 characters").optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

const listMessagesSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    skip: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

module.exports = {
  askConversationSchema,
  listConversationsSchema,
  listMessagesSchema,
};

export {};