import { Request, Response } from "express";

import Organization from "../../models/Organization";

import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { asyncHandler } from "../../utils/asyncHandler";
import { decryptApiKey } from "../../utils/cryptoApiKey";
import { createApiKeySchema } from "../../validators/organization.validator";
import {
  assertCompanyAdmin,
  buildApiKeyRecordPayload,
  buildCompanyApiKeyPayload,
  cleanString,
  createOrganizationApiKey,
} from "./helpers";

const listMyCompanyApiKeys = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select("_id api_keys");

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const apiKeys = Array.isArray(organization.api_keys)
    ? organization.api_keys
        .map((record: any) => buildApiKeyRecordPayload(record))
        .filter(Boolean)
        .sort((left: any, right: any) => {
          const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
          return rightTime - leftTime;
        })
    : [];

  apiResponse(res, 200, "Company API keys fetched successfully", {
    apiKeys,
  });
});

const createMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const parsed = createApiKeySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings api_keys"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const name = cleanString(parsed.data.name, "Primary");
  const { rawApiKey, apiKeyRecord } = await createOrganizationApiKey(organization, name);

  await organization.save();

  apiResponse(res, 201, "Company API key created successfully", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(apiKeyRecord),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const revokeMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const apiKeys = Array.isArray(organization.api_keys) ? organization.api_keys : [];
  const record = apiKeys.find((item: any) => String(item?._id) === apiKeyId);

  if (!record) {
    throw new AppError("API key not found", 404);
  }

  if (!record.revoked_at) {
    record.revoked_at = new Date();
  }

  if (record?.key_prefix && organization?.api_settings?.key_prefix === record.key_prefix) {
    organization.set("api_settings.key_prefix", "");
    organization.set("api_settings.api_key_hash", "");
  }

  await organization.save();

  apiResponse(res, 200, "Company API key revoked successfully", {
    apiKeyRecord: buildApiKeyRecordPayload(record),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const getMyCompanyApiKeySettings = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  apiResponse(res, 200, "Company API settings fetched successfully", {
    ...buildCompanyApiKeyPayload(organization),
  });
});

const rotateMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);

  const organization = await Organization.findById(requester.company).select(
    "_id api_settings api_keys"
  );

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const { rawApiKey, apiKeyRecord } = await createOrganizationApiKey(
    organization,
    "Primary"
  );

  await organization.save();

  apiResponse(res, 200, "Company API key rotated successfully", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(apiKeyRecord),
    ...buildCompanyApiKeyPayload(organization),
  });
});

const revealMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys"
  );
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const record = organization.api_keys.id(apiKeyId);
  if (!record) {
    throw new AppError("API key not found", 404);
  }

  if (record.revoked_at) {
    throw new AppError("Cannot reveal a revoked API key", 400);
  }

  if (!record.encrypted_key || !record.iv) {
    throw new AppError("This API key cannot be revealed", 400);
  }

  record.last_revealed_at = new Date();
  await organization.save();

  const rawApiKey = decryptApiKey(record.encrypted_key, record.iv);

  apiResponse(res, 200, "API key revealed", {
    apiKey: rawApiKey,
    apiKeyRecord: buildApiKeyRecordPayload(record),
  });
});

const deleteMyCompanyApiKey = asyncHandler(async (req: Request, res: Response) => {
  const requester = assertCompanyAdmin(req);
  const apiKeyId = cleanString(req.params.apiKeyId);

  if (!apiKeyId) {
    throw new AppError("API key id is required", 400);
  }

  const organization = await Organization.findById(requester.company).select(
    "_id api_keys api_settings"
  );
  if (!organization) {
    throw new AppError("Organization not found", 404);
  }

  const record = organization.api_keys.id(apiKeyId);
  if (!record) {
    throw new AppError("API key not found", 404);
  }

  // If this was the active global key setting, we might need to clear it, but let's just delete the subdoc
  organization.api_keys.pull(record._id);

  if (organization.api_keys.length > 0) {
     const lastKey = organization.api_keys[organization.api_keys.length - 1];
     organization.set("api_settings.key_prefix", lastKey.key_prefix);
     organization.set("api_settings.encrypted_key", lastKey.encrypted_key);
     organization.set("api_settings.iv", lastKey.iv);
  } else {
     organization.set("api_settings.key_prefix", "");
     organization.set("api_settings.encrypted_key", "");
     organization.set("api_settings.iv", "");
  }

  await organization.save();

  apiResponse(res, 200, "API key deleted successfully", {
    success: true,
  });
});

export {
  listMyCompanyApiKeys,
  createMyCompanyApiKey,
  revokeMyCompanyApiKey,
  revealMyCompanyApiKey,
  deleteMyCompanyApiKey,
  getMyCompanyApiKeySettings,
  rotateMyCompanyApiKey,
};
