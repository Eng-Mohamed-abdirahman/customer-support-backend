import { Request, Response } from "express";
import path from "path";

const { apiResponse } = require("../utils/apiResponse");
const { AppError } = require("../utils/appError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUploadPresignedUrl, uploadFile, getFileUrl } = require("../services/storage.service");
const { buildPublicObjectUrl } = require("../config/backblaze");
const upload = require("../middlewares/upload").default;

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

  const sanitizedFilename = sanitizeFilename(path.basename(filename, extension)) + extension;
  const objectKey = `logos/${organizationId}/${Date.now()}-${sanitizedFilename}`;

  const uploadUrl = await getUploadPresignedUrl(objectKey, contentType);
  const publicUrl = buildPublicObjectUrl(objectKey);
  const downloadUrl = await getFileUrl(objectKey);

  apiResponse(res, 200, "Presigned upload URL created successfully", {
    uploadUrl,
    publicUrl,
    downloadUrl,
    objectKey,
  });
});

const uploadLogo = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const type = normalizeText(String(req.query.type ?? "")).toLowerCase();

  if (type !== "logo") {
    throw new AppError("type query parameter must be set to 'logo'", 400);
  }

  const file = (req as any).file;
  if (!file || !file.buffer || !file.originalname || !file.mimetype) {
    throw new AppError("A file must be uploaded under the 'file' field", 400);
  }

  const allowedContentTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (!allowedContentTypes.includes(file.mimetype)) {
    throw new AppError("Only PNG, JPEG, and SVG files are supported", 400);
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".png", ".jpg", ".jpeg", ".svg"];
  if (!allowedExtensions.includes(extension)) {
    throw new AppError("Unsupported file extension. Only .png, .jpg, .jpeg, and .svg are allowed", 400);
  }

  const result = await uploadFile(file.buffer, `logos/${organizationId}`, file.mimetype);

  apiResponse(res, 200, "Logo uploaded successfully", {
    url: result.url,
    publicUrl: result.publicUrl,
    publicId: result.publicId,
  });
});

module.exports = {
  getPresignedUploadUrl,
  uploadLogo,
  uploadMiddleware: upload.single("file"),
};

export {};