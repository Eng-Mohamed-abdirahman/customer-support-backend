const B2 = require("backblaze-b2");
import axios from "axios";

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID || "",
  applicationKey: process.env.B2_APPLICATION_KEY || "",
});

export async function uploadStreamToBackblaze(
  buffer: Buffer,
  filename: string,
  contentType = "application/octet-stream"
): Promise<string> {
  if (!process.env.B2_BUCKET_ID) {
    throw new Error("B2_BUCKET_ID not configured");
  }

  await b2.authorize();

  const uploadUrlResp = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });
  const { uploadUrl, authorizationToken } = uploadUrlResp.data;

  const resp = await axios.post(uploadUrl, buffer, {
    headers: {
      Authorization: authorizationToken,
      "Content-Type": contentType,
      "X-Bz-File-Name": filename,
      "Content-Length": String(buffer.length),
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  // Construct public URL. Use override if provided in env.
  const bucketName = process.env.B2_BUCKET_NAME || "";
  const publicBase = process.env.B2_PUBLIC_BASE_URL || `${process.env.B2_PUBLIC_HOST || "https://f004.backblazeb2.com"}/file/${bucketName}`;
  return `${publicBase}/${encodeURIComponent(filename)}`;
}
