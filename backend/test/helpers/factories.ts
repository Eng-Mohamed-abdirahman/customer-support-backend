import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { env } from "../../src/config/env";
import Conversation from "../../src/models/Conversation";
import Organization from "../../src/models/Organization";
import User from "../../src/models/User";
import { encryptApiKey } from "../../src/utils/cryptoApiKey";
import { generateApiKey, getApiKeyPrefix } from "../../src/utils/generateApiKey";
import { hashPassword } from "../../src/utils/hash";

let counter = 0;
const unique = () => `${Date.now()}${++counter}`;

export const TEST_PASSWORD = "Password123!";

export const createUser = async (
  overrides: { role?: "admin" | "company-admin" | "staff"; company?: mongoose.Types.ObjectId | null; email?: string } = {}
) => {
  return User.create({
    firstName: "Test",
    lastName: "User",
    email: overrides.email ?? `user${unique()}@example.com`,
    password: await hashPassword(TEST_PASSWORD),
    role: overrides.role ?? "admin",
    company: overrides.company ?? null,
  });
};

/** API key record in the same shape the dashboard creates. */
export const buildApiKeyRecord = (name = "Primary") => {
  const rawKey = generateApiKey();
  const { encryptedKey, iv } = encryptApiKey(rawKey);
  return {
    rawKey,
    record: { name, key_prefix: getApiKeyPrefix(rawKey), encrypted_key: encryptedKey, iv, created_at: new Date() },
  };
};

/** An active organization with one API key. Returns the raw key so tests can call API-key routes. */
export const createOrganization = async (name = `Org ${unique()}`) => {
  // Company users must belong to a company, so create the organization first.
  const ownerId = new mongoose.Types.ObjectId();
  const { rawKey, record } = buildApiKeyRecord();

  const organization = await Organization.create({
    slug: name.toLowerCase().replace(/\W+/g, "-"),
    normalizedName: name.toLowerCase(),
    status: "active",
    createdBy: ownerId,
    profile: { name },
    contact: { supportEmail: `support${unique()}@example.com` },
    api_settings: {
      key_prefix: record.key_prefix,
      encrypted_key: record.encrypted_key,
      iv: record.iv,
      monthly_limit: 100000,
    },
    api_keys: [record],
  });

  const owner = await createUser({ role: "company-admin", company: organization._id });
  await Organization.updateOne({ _id: organization._id }, { $set: { createdBy: owner._id } });

  return { organization, owner, apiKey: rawKey };
};

export const createConversation = async (
  organizationId: mongoose.Types.ObjectId,
  overrides: Partial<{ status: "open" | "pending" | "closed"; customerPhone: string }> = {}
) =>
  Conversation.create({
    organizationId,
    channel: "website",
    customerPhone: overrides.customerPhone ?? `+25261${unique().slice(-7)}`,
    customerName: "Customer",
    status: overrides.status ?? "open",
  });

/** A dashboard JWT for the given user, signed exactly like the login endpoint. */
export const tokenFor = (user: { _id: unknown }) =>
  jwt.sign({ id: String(user._id) }, env.JWT_SECRET, {
    expiresIn: "1h",
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

export const authHeader = (user: { _id: unknown }) => ({ Authorization: `Bearer ${tokenFor(user)}` });
