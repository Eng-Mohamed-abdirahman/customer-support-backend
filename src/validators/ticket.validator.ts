const { z } = require("zod");

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const createTicketSchema = z
  .object({
    customerId: z.string().optional().refine((value: string | undefined) => true),
    title: z.string().trim().min(3, "Title is required").max(160, "Title cannot exceed 160 characters"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .refine((value: string) => countWords(value) >= 5, {
        message: "Description must be at least 5 words",
      })
      .max(2000, "Description cannot exceed 2000 characters"),
    conversationId: z
      .string()
      .trim()
      .max(120, "Conversation ID cannot exceed 120 characters")
      .optional(),
    customerName: z
      .string()
      .trim()
      .max(120, "Customer name cannot exceed 120 characters")
      .optional(),
    customerPhone: z
      .string()
      .trim()
      .max(40, "Customer phone cannot exceed 40 characters")
      .optional(),
  })
  .strict();

const listTicketsSchema = z
  .object({
    status: z.enum(["open", "pending", "closed"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

const updateTicketStatusSchema = z
  .object({
    status: z.enum(["open", "pending", "closed"]),
  })
  .strict();

module.exports = {
  createTicketSchema,
  listTicketsSchema,
  updateTicketStatusSchema,
};

export {};
