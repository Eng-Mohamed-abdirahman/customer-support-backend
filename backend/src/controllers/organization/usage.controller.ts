import { Request, Response } from "express";

import Organization from "../../models/Organization";

import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  assertOrganizationMember,
  assertPlatformAdmin,
  buildCompanyUsagePayload,
} from "./helpers";

const getMyCompanyUsage = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertOrganizationMember(req);

  const organization = await Organization.findById(requester.company).select(
    "_id status profile subscription api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Company usage fetched successfully", {
    ...buildCompanyUsagePayload(organization),
  });
});

const listOrganizationsUsage = asyncHandler(async (req: Request, res: Response) => {
  assertPlatformAdmin(req);

  const organizations = await Organization.find()
    .sort({ createdAt: -1 })
    .select("_id status profile subscription api_settings createdAt")
    .lean();

  const rows = organizations.map((organization: any) => ({
    ...buildCompanyUsagePayload(organization),
    createdAt: organization.createdAt,
  }));

  apiResponse(res, 200, "Organization usage fetched successfully", rows);
});

export {
  getMyCompanyUsage,
  listOrganizationsUsage,
};
