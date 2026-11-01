import dotenv from "dotenv";
import mongoose from "mongoose";

import User from "../models/User";
import { hashPassword } from "../utils/hash";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/support-saas";
type UserRole = "admin" | "company-admin" | "staff";

const legacyName = process.env.SUPER_ADMIN_NAME?.trim() || "Super Admin";
const [legacyFirstName = "Super", ...legacyLastNameParts] = legacyName.split(/\s+/);
const legacyLastName = legacyLastNameParts.join(" ") || "Admin";

const seedUserEmail =
  process.env.SEED_USER_EMAIL?.trim().toLowerCase() ||
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const seedUserPassword = process.env.SEED_USER_PASSWORD || process.env.SUPER_ADMIN_PASSWORD;
const seedUserFirstName = (process.env.SEED_USER_FIRST_NAME?.trim() || legacyFirstName).trim();
const seedUserLastName = (process.env.SEED_USER_LAST_NAME?.trim() || legacyLastName).trim();
const seedUserRoleRaw = (process.env.SEED_USER_ROLE?.trim().toLowerCase() || "admin") as UserRole;
const seedUserCompany = process.env.SEED_USER_COMPANY?.trim();

const allowedRoles: UserRole[] = ["admin", "company-admin", "staff"];

const parseRole = (): UserRole => {
  if (allowedRoles.includes(seedUserRoleRaw)) {
    return seedUserRoleRaw;
  }

  console.error(
    `[seed:user] Invalid SEED_USER_ROLE: ${seedUserRoleRaw}. Allowed values: ${allowedRoles.join(
      ", "
    )}.`
  );
  process.exit(1);
};

const resolveCompanyForRole = (role: UserRole): string | null => {
  if (role === "admin") {
    return null;
  }

  if (!seedUserCompany) {
    console.error("[seed:user] SEED_USER_COMPANY is required for company-admin and staff.");
    process.exit(1);
  }

  if (!mongoose.Types.ObjectId.isValid(seedUserCompany)) {
    console.error("[seed:user] SEED_USER_COMPANY must be a valid MongoDB ObjectId.");
    process.exit(1);
  }

  return seedUserCompany;
};

const seedUser = async () => {
  if (!seedUserEmail || !seedUserPassword) {
    console.error(
      "[seed:user] Missing env values. Set SEED_USER_EMAIL and SEED_USER_PASSWORD (or legacy SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD)."
    );
    process.exit(1);
  }

  const role = parseRole();
  const company = resolveCompanyForRole(role);

  try {
    await mongoose.connect(mongoUri);

    const password = await hashPassword(seedUserPassword);
    const existingUser = await User.findOne({ email: seedUserEmail });

    if (existingUser) {
      existingUser.firstName = seedUserFirstName;
      existingUser.lastName = seedUserLastName;
      existingUser.password = password;
      existingUser.role = role;
      existingUser.set("company", company);
      await existingUser.save();

      console.log(`[seed:user] Updated user: ${seedUserEmail} (${role})`);
    } else {
      await User.create({
        firstName: seedUserFirstName,
        lastName: seedUserLastName,
        email: seedUserEmail,
        password,
        role,
        company,
      });

      console.log(`[seed:user] Created user: ${seedUserEmail} (${role})`);
    }
  } catch (error) {
    console.error("[seed:user] Failed to seed user", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
};

void seedUser();
