import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";
import { AppError } from "../utils/appError";

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$|\s+$/g, "");
};

const endpoint = normalizeUrl(env.B2_S3_ENDPOINT || env.B2_ENDPOINT || "");

export const B2_BUCKET_NAME = env.B2_BUCKET_NAME;

/** True when every Backblaze B2 setting needed for uploads is present. */
export const isStorageConfigured = (): boolean =>
  Boolean(endpoint && env.B2_BUCKET_NAME && env.B2_ACCESS_KEY_ID && env.B2_SECRET_ACCESS_KEY);

let s3Client: S3Client | null = null;

/**
 * The S3 client is created on first use, so the API can start without storage
 * configured; only upload features fail until the B2 settings are provided.
 */
export const getS3Client = (): S3Client => {
  if (!isStorageConfigured()) {
    throw new AppError(
      "File storage is not configured. Set B2_S3_ENDPOINT, B2_BUCKET_NAME, B2_ACCESS_KEY_ID and B2_SECRET_ACCESS_KEY.",
      503
    );
  }

  if (!s3Client) {
    s3Client = new S3Client({
      endpoint,
      region: env.B2_REGION || "us-west-004",
      credentials: {
        accessKeyId: env.B2_ACCESS_KEY_ID,
        secretAccessKey: env.B2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      // Browser PUT uploads cannot send SDK checksum headers; avoid embedding them in presigned URLs.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  return s3Client;
};

const publicUrlBase = () => normalizeUrl(env.B2_PUBLIC_URL_BASE || `${endpoint}/${env.B2_BUCKET_NAME}`);

/** Path-style S3 URL: {endpoint}/{bucket}/{objectKey} */
export function buildPublicObjectUrl(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "");
  const bucket = B2_BUCKET_NAME;
  const base = publicUrlBase();

  if (base.endsWith(`/${bucket}`)) {
    return `${base}/${key}`;
  }

  return `${base}/${bucket}/${key}`;
}

export function extractStorageObjectKey(value: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/((?:logos|outputs)\/[A-Za-z0-9._/-]+)/);
  return match ? match[1] : null;
}
