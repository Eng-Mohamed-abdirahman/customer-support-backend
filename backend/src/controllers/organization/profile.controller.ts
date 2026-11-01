import { Request, Response } from "express";

import Organization from "../../models/Organization";

import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { updateMyOrganizationProfileSchema } from "../../validators/organization.validator";
import { resolveLogoDisplayUrl } from "../../utils/logoUrl";
import {
  DEFAULT_FALLBACK_MESSAGE,
  DEFAULT_LANGUAGE,
  DEFAULT_TIMEZONE,
  assertCompanyAdmin,
  buildCompanyAdminOrganizationPayload,
  cleanString,
  createUniqueSlug,
  normalizeEmail,
} from "./helpers";

const updateMyCompanyProfile = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const parsed = updateMyOrganizationProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id slug status profile contact businessInfo supportSettings enabledFeatures createdAt +normalizedName"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const nextName = parsed.data.profile.name.trim();
  const nextNormalizedName = nextName.toLowerCase();

  if (organization.normalizedName !== nextNormalizedName) {
    const existingOrganization = await Organization.findOne({
      normalizedName: nextNormalizedName,
      _id: { $ne: organization._id },
    }).select("_id");

    if (existingOrganization) {
      throw new AppError("A company with this name already exists", 409);
    }

    organization.slug = await createUniqueSlug(nextName);
  }

  organization.profile = {
    ...(organization.profile || {}),
    name: nextName,
    logoUrl: cleanString(
      parsed.data.profile.logoUrl,
      cleanString(organization.profile?.logoUrl)
    ),
    websiteUrl: cleanString(
      parsed.data.profile.websiteUrl,
      cleanString(organization.profile?.websiteUrl)
    ),
    businessType: cleanString(
      parsed.data.profile.businessType,
      cleanString(organization.profile?.businessType)
    ),
    description: cleanString(
      parsed.data.profile.description,
      cleanString(organization.profile?.description)
    ),
  };

  organization.contact = {
    ...(organization.contact || {}),
    supportEmail: normalizeEmail(parsed.data.contact.supportEmail),
    phone: cleanString(parsed.data.contact.phone, cleanString(organization.contact?.phone)),
    address: cleanString(parsed.data.contact.address, cleanString(organization.contact?.address)),
  };

  organization.businessInfo = {
    ...(organization.businessInfo || {}),
    workingHours: cleanString(
      parsed.data.businessInfo?.workingHours,
      cleanString(organization.businessInfo?.workingHours)
    ),
    services: cleanString(
      parsed.data.businessInfo?.services,
      cleanString(organization.businessInfo?.services)
    ),
    products: cleanString(
      parsed.data.businessInfo?.products,
      cleanString(organization.businessInfo?.products)
    ),
    policies: cleanString(
      parsed.data.businessInfo?.policies,
      cleanString(organization.businessInfo?.policies)
    ),
    location: cleanString(
      parsed.data.businessInfo?.location,
      cleanString(organization.businessInfo?.location)
    ),
  };

  organization.supportSettings = {
    ...(organization.supportSettings || {}),
    fallbackMessage: cleanString(
      parsed.data.supportSettings?.fallbackMessage,
      cleanString(organization.supportSettings?.fallbackMessage, DEFAULT_FALLBACK_MESSAGE)
    ),
    timezone: cleanString(
      parsed.data.supportSettings?.timezone,
      cleanString(organization.supportSettings?.timezone, DEFAULT_TIMEZONE)
    ),
    language: cleanString(
      parsed.data.supportSettings?.language,
      cleanString(organization.supportSettings?.language, DEFAULT_LANGUAGE)
    ),
  };

  if (parsed.data.enabledFeatures !== undefined) {
    organization.enabledFeatures = Array.isArray(parsed.data.enabledFeatures)
      ? parsed.data.enabledFeatures.filter((f: unknown) => typeof f === "string")
      : [];
  }

  organization.normalizedName = nextNormalizedName;

  await organization.save();

  const organizationPayload = buildCompanyAdminOrganizationPayload(organization);
  organizationPayload.profile.logoUrl = await resolveLogoDisplayUrl(
    organizationPayload.profile.logoUrl
  );

  apiResponse(res, 200, "Company profile updated successfully", {
    organization: organizationPayload,
  });
});

export {
  updateMyCompanyProfile,
};
