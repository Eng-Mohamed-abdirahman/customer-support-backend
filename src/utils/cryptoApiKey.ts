import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.JWT_SECRET || "default_secret").digest();

export const encryptApiKey = (rawApiKey: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(rawApiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return {
    encryptedKey: encrypted,
    iv: iv.toString("hex"),
  };
};

export const decryptApiKey = (encryptedKey: string, ivHex: string) => {
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
};
