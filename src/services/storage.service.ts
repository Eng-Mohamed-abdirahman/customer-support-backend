import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, B2_BUCKET_NAME, BACKBLAZE_PUBLIC_URL_BASE } from "../config/backblaze";
import { AppError } from "../utils/appError";

const ensureBackblazeConfigured = () => {
  if (!B2_BUCKET_NAME) {
    throw new AppError("Backblaze B2 storage is not configured. Set B2_BUCKET_NAME in .env.", 500);
  }
};

export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ publicUrl: string; publicId: string }> {
  ensureBackblazeConfigured();

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    publicUrl: `${BACKBLAZE_PUBLIC_URL_BASE}/${B2_BUCKET_NAME}/${key}`,
    publicId: key,
  };
}

export async function getUploadPresignedUrl(
  key: string,
  contentType: string
): Promise<string> {
  ensureBackblazeConfigured();

  const command = new PutObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export async function getFileUrl(
  key: string,
  expiresIn = 86400
): Promise<string> {
  ensureBackblazeConfigured();

  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  ensureBackblazeConfigured();

  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}
