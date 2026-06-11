import { Request, Response } from "express";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { env } = require("../config/env");

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const resolveOrganizationId = (req: Request): string => {
  const requester = (req as any).user;
  const organizationId =
    normalizeText(requester?.organizationId) ||
    normalizeText(requester?.company) ||
    normalizeText((req as any).organizationId);

  if (!organizationId) {
    throw new AppError("Organization context is missing for this request", 400);
  }

  return String(organizationId);
};

const validateBackblazeConfig = () => {
  if (
    !env.B2_S3_ENDPOINT ||
    !env.B2_BUCKET_NAME ||
    !env.B2_PUBLIC_URL_BASE ||
    !env.B2_ACCESS_KEY_ID ||
    !env.B2_SECRET_ACCESS_KEY
  ) {
    throw new AppError(
      "Backblaze B2 storage is not configured. Please set the required environment variables.",
      500
    );
  }
};

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
};

const buildS3Client = () => {
  return new S3Client({
    endpoint: normalizeUrl(env.B2_S3_ENDPOINT),
    region: env.B2_REGION || "us-west-004",
    credentials: {
      accessKeyId: env.B2_ACCESS_KEY_ID,
      secretAccessKey: env.B2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
};

const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 128);
};

const getPresignedUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const filename = normalizeText(String(req.query.filename ?? ""));
  const contentType = normalizeText(String(req.query.contentType ?? ""));
  const type = normalizeText(String(req.query.type ?? "")).toLowerCase();

  if (!filename) {
    throw new AppError("filename query parameter is required", 400);
  }
  if (!contentType) {
    throw new AppError("contentType query parameter is required", 400);
  }
  if (type !== "logo") {
    throw new AppError("type query parameter must be set to 'logo'", 400);
  }

  const allowedContentTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (!allowedContentTypes.includes(contentType)) {
    throw new AppError("Only PNG, JPEG, and SVG files are supported", 400);
  }

  const extension = path.extname(filename).toLowerCase();
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".svg"];
  if (!allowedExtensions.includes(extension)) {
    throw new AppError("Unsupported file extension. Only .png, .jpg, .jpeg, and .svg are allowed", 400);
  }

  validateBackblazeConfig();

  const sanitizedFilename = sanitizeFilename(path.basename(filename, extension)) + extension;
  const objectKey = `logos/${organizationId}/${Date.now()}-${sanitizedFilename}`;

  const s3Client = buildS3Client();
  const command = new PutObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const publicUrlBase = normalizeUrl(env.B2_PUBLIC_URL_BASE);
  const publicUrl = `${publicUrlBase}/${env.B2_BUCKET_NAME}/${objectKey}`;

  apiResponse(res, 200, "Presigned upload URL created successfully", {
    uploadUrl,
    publicUrl,
  });
});

module.exports = {
  getPresignedUploadUrl,
};

export {};