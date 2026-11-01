import { Request, Response } from "express";

import mongoose from "mongoose";
import BrandIdentity from "../models/BrandIdentity";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { createBrandIdentitySchema } from "../validators/brand.validator";
import { resolveLogoDisplayUrl } from "../utils/logoUrl";

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveOrganizationId = (req: Request): string => {
  const requester = req.user;
  const organizationId =
    normalizeText(requester?.organizationId) ||
    normalizeText(requester?.company) ||
    normalizeText(req.organizationId);

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this request", 400);
  }

  return String(organizationId);
};

const buildBrandPayload = (input: any, organizationId: string) => ({
  organizationId,
  brandName: normalizeText(input.brandName),
  primaryColor: normalizeText(input.primaryColor),
  secondaryColor: normalizeText(input.secondaryColor),
  fontStyle: normalizeText(input.fontStyle),
  logoUrl: normalizeText(input.logoUrl),
});

const saveBrandIdentity = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const parsed = createBrandIdentitySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const payload = buildBrandPayload(parsed.data, organizationId);

  const brandIdentity = await BrandIdentity.findOneAndUpdate(
    { organizationId },
    payload,
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  if (!brandIdentity) {
    throw new AppError("Unable to save brand identity", 500);
  }

  const responseData = {
    id: String(brandIdentity._id),
    organizationId: String(brandIdentity.organizationId),
    brandName: brandIdentity.brandName,
    primaryColor: brandIdentity.primaryColor,
    secondaryColor: brandIdentity.secondaryColor,
    fontStyle: brandIdentity.fontStyle,
    logoUrl: await resolveLogoDisplayUrl(brandIdentity.logoUrl),
  };

  apiResponse(res, 200, "Brand identity saved successfully", responseData);
});

const getCurrentBrandIdentity = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const brandIdentity = await BrandIdentity.findOne({ organizationId }).lean();

  if (!brandIdentity) {
    apiResponse(res, 200, "Brand identity retrieved successfully", null);
    return;
  }

  apiResponse(res, 200, "Brand identity retrieved successfully", {
    id: String(brandIdentity._id),
    organizationId: String(brandIdentity.organizationId),
    brandName: brandIdentity.brandName,
    primaryColor: brandIdentity.primaryColor,
    secondaryColor: brandIdentity.secondaryColor,
    fontStyle: brandIdentity.fontStyle,
    logoUrl: await resolveLogoDisplayUrl(brandIdentity.logoUrl),
  });
});

export {
  saveBrandIdentity,
  getCurrentBrandIdentity,
};

