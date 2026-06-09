import crypto from "crypto";
import { env } from "../config/env";

const CBC_ALGORITHM = "aes-256-cbc";
const GCM_ALGORITHM = "aes-256-gcm";

// Clean and prepare the encryption key buffer from process.env.ENCRYPTION_KEY
// Standard key size for aes-256 is 32 bytes (256 bits).
let keyBuffer: Buffer;
if (process.env.ENCRYPTION_KEY) {
  const cleanKey = process.env.ENCRYPTION_KEY.trim();
  if (cleanKey.length === 64 && /^[0-9a-fA-F]+$/.test(cleanKey)) {
    keyBuffer = Buffer.from(cleanKey, "hex");
  } else {
    keyBuffer = crypto.createHash("sha256").update(cleanKey).digest();
  }
} else {
  keyBuffer = crypto.createHash("sha256").update(env.JWT_SECRET || "default_secret").digest();
}

const ENCRYPTION_KEY = keyBuffer;
// CBC fallback uses the hash of JWT_SECRET for backward compatibility
const CBC_ENCRYPTION_KEY = crypto.createHash("sha256").update(env.JWT_SECRET || "default_secret").digest();

export const encryptApiKey = (rawApiKey: string) => {
  // Use AES-256-GCM as required
  const iv = crypto.randomBytes(12); // Standard GCM IV length is 12 bytes
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(rawApiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedKey: `${encrypted}:${authTag.toString("hex")}`,
    iv: iv.toString("hex"),
  };
};

export const decryptApiKey = (encryptedKey: string, ivHex: string) => {
  if (!encryptedKey || !ivHex) {
    throw new Error("Encrypted key and IV are required for decryption");
  }

  const parts = encryptedKey.split(":");
  
  if (parts.length === 2) {
    // AES-256-GCM decryption
    const [ctHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, ENCRYPTION_KEY, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ctHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } else {
    // Fallback to AES-256-CBC decryption for legacy data
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(CBC_ALGORITHM, CBC_ENCRYPTION_KEY, iv);
    
    let decrypted = decipher.update(encryptedKey, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
};

