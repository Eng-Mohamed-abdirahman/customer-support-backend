const { z } = require("zod");

const phoneSchema = z
  .string()
  .trim()
  .min(6, "Phone number is too short")
  .max(20, "Phone number cannot exceed 20 characters")
  .regex(/^\+?[0-9]+$/, "Phone must contain only digits and an optional leading +");

const createContactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name cannot exceed 120 characters"),
    phone: phoneSchema,
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    company: z.string().trim().max(120, "Company cannot exceed 120 characters").optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
    notes: z.string().trim().max(2000, "Notes cannot exceed 2000 characters").optional(),
  })
  .strict();

const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    company: z.string().trim().max(120).optional(),
    tags: z.array(z.string().trim().max(40)).max(20).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

const listContactsSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    skip: z.coerce.number().int().min(0).max(5000).optional(),
  })
  .strict();

module.exports = {
  createContactSchema,
  updateContactSchema,
  listContactsSchema,
};

export {};
