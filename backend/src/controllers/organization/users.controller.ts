import { Request, Response } from "express";

import Organization from "../../models/Organization";
import User from "../../models/User";
import BrandIdentity from "../../models/BrandIdentity";

import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { resolveLogoDisplayUrl } from "../../utils/logoUrl";
import {
  assertCompanyAdmin,
  buildCompanyAdminOrganizationPayload,
  cleanString,
} from "./helpers";

const listMyCompanyUsers = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company)
    .select("_id slug status profile contact businessInfo supportSettings enabledFeatures createdAt")
    .lean();

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const users = await User.find({ company: requester.company })
    .select("_id firstName lastName email role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const userRows = users.map((user: any) => ({
    _id: String(user._id),
    fullName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }));

  const organizationPayload = buildCompanyAdminOrganizationPayload(organization);
  organizationPayload.profile.logoUrl = await resolveLogoDisplayUrl(
    organizationPayload.profile.logoUrl
  );

  const brandIdentity = await BrandIdentity.findOne({ organizationId: organization._id }).lean();
  const brand =
    brandIdentity
      ? {
          brandName: cleanString(brandIdentity.brandName),
          primaryColor: cleanString(brandIdentity.primaryColor),
          secondaryColor: cleanString(brandIdentity.secondaryColor),
          fontStyle: cleanString(brandIdentity.fontStyle),
          logoUrl: await resolveLogoDisplayUrl(cleanString(brandIdentity.logoUrl)),
        }
      : null;

  apiResponse(res, 200, "Company users fetched successfully", {
    organization: organizationPayload,
    brand,
    userCount: userRows.length,
    users: userRows,
  });
});

export {
  listMyCompanyUsers,
};
