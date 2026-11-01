import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$|\s+$/g, "");
};

const rawEndpoint = env.B2_S3_ENDPOINT || env.B2_ENDPOINT || "";
const endpoint = normalizeUrl(rawEndpoint);
if (!endpoint) {
  throw new Error("B2 endpoint is not configured. Set B2_S3_ENDPOINT or B2_ENDPOINT in .env.");
}

if (!env.B2_BUCKET_NAME) {
  throw new Error("B2 bucket name is not configured. Set B2_BUCKET_NAME in .env.");
}

if (!env.B2_ACCESS_KEY_ID || !env.B2_SECRET_ACCESS_KEY) {
  throw new Error("B2 credentials are not configured. Set B2_ACCESS_KEY_ID and B2_SECRET_ACCESS_KEY in .env.");
}

const s3Client = new S3Client({
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

export default s3Client;
export const B2_BUCKET_NAME = env.B2_BUCKET_NAME;
export const BACKBLAZE_PUBLIC_URL_BASE = normalizeUrl(
  env.B2_PUBLIC_URL_BASE || `${endpoint}/${env.B2_BUCKET_NAME}`
);

/** Path-style S3 URL: {endpoint}/{bucket}/{objectKey} */
export function buildPublicObjectUrl(objectKey: string): string {
  const key = objectKey.replace(/^\/+/, "");
  const bucket = B2_BUCKET_NAME;

  if (BACKBLAZE_PUBLIC_URL_BASE.endsWith(`/${bucket}`)) {
    return `${BACKBLAZE_PUBLIC_URL_BASE}/${key}`;
  }

  return `${BACKBLAZE_PUBLIC_URL_BASE}/${bucket}/${key}`;
}

export function extractStorageObjectKey(value: string): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/((?:logos|outputs)\/[A-Za-z0-9._/-]+)/);
  return match ? match[1] : null;
}