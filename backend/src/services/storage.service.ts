import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { getS3Client, B2_BUCKET_NAME, buildPublicObjectUrl } from "../config/backblaze";
import { AppError } from "../utils/appError";

const ensureBackblazeConfigured = () => {
  if (!B2_BUCKET_NAME) {
    throw new AppError("Backblaze B2 storage is not configured. Set B2_BUCKET_NAME in .env.", 500);
  }
};

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  mimetype: string
): Promise<{ url: string; publicId: string; publicUrl: string }> {
  ensureBackblazeConfigured();

  const filename = crypto.randomUUID();
  const key = folder ? `${folder}/${filename}` : filename;

  try {
    const upload = new Upload({
      client: getS3Client(),
      params: {
        Bucket: B2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      },
    });

    await upload.done();
  } catch (error) {
    console.error("B2 Upload Failed:", error);
    throw new Error(`B2 Upload Failed: ${(error as any).message}`);
  }

  const url = await getFileUrl(key);

  return {
    url,
    publicId: key,
    publicUrl: buildPublicObjectUrl(key),
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

  // Only sign "host" so browser PUTs are not rejected when Content-Type is omitted.
  return await getSignedUrl(getS3Client(), command, { expiresIn: 300 });
}

export async function getFileUrl(
  publicId: string,
  expiresIn = 86400
): Promise<string> {
  if (!publicId) return "";
  ensureBackblazeConfigured();

  const command = new GetObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: publicId,
  });

  return await getSignedUrl(getS3Client(), command, { expiresIn });
}

export async function deleteFile(publicId: string): Promise<void> {
  ensureBackblazeConfigured();

  const command = new DeleteObjectCommand({
    Bucket: B2_BUCKET_NAME,
    Key: publicId,
  });

  await getS3Client().send(command);
}
