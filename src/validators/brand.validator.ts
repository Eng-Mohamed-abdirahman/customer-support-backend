import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const createBrandIdentitySchema = z.object({
  brandName: z.string().trim().min(1, "Brand name is required"),
  primaryColor: z.string().regex(hexColorRegex, "Primary color must be a valid hex code"),
  secondaryColor: z.string().regex(hexColorRegex, "Secondary color must be a valid hex code"),
  fontStyle: z.string().trim().min(1, "Font style is required"),
  logoUrl: z.string().trim().url("Logo URL must be a valid URL"),
});

module.exports = {
  createBrandIdentitySchema,
};

export {};