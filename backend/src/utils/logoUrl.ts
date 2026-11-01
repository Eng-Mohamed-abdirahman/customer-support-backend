import { extractStorageObjectKey } from "../config/backblaze";
import { getFileUrl } from "../services/storage.service";

const LOGO_URL_EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days

export const resolveLogoDisplayUrl = async (storedLogoUrl: string): Promise<string> => {
  if (!storedLogoUrl) {
    return "";
  }

  const objectKey = extractStorageObjectKey(storedLogoUrl);
  if (!objectKey) {
    return storedLogoUrl;
  }

  try {
    return await getFileUrl(objectKey, LOGO_URL_EXPIRES_IN);
  } catch {
    return storedLogoUrl;
  }
};

export { LOGO_URL_EXPIRES_IN };


