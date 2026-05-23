const { z } = require("zod");

const createTicketSchema = z
  .object({
    title: z.string().trim().min(3, "Title is required").max(160, "Title cannot exceed 160 characters"),
    description: z
      .string()
      .trim()
      .min(5, "Description is required")
      .max(2000, "Description cannot exceed 2000 characters"),
  })
  .strict();

const listTicketsSchema = z
  .object({
    status: z.enum(["open", "pending", "closed"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

module.exports = {
  createTicketSchema,
  listTicketsSchema,
};

export {};
