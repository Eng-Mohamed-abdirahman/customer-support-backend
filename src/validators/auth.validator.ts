import { z } from "zod";

const roleSchema = z.enum(["admin", "company-admin", "staff"]);

export const signupSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema.optional(),
  company: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  const role = data.role ?? "staff";

  if (role !== "admin" && !data.company) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["company"],
      message: "company is required for company-admin and staff",
    });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateCurrentUserSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
});