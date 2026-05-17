const User = require("../models/User");
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { hashPassword, comparePassword } from "../utils/hash";

type UserRole = "admin" | "company-admin" | "staff";

type SafeAuthUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  company: string | null;
};

type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
  company?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type UpdateCurrentUserInput = {
  firstName: string;
  lastName: string;
  email: string;
};

const toSafeAuthUser = (user: any): SafeAuthUser => {
  const companyValue = user.company ? String(user.company) : null;

  return {
    _id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    company: companyValue,
  };
};

const resolveRole = (role?: UserRole): UserRole => role ?? "staff";

const resolveCompany = (role: UserRole, company?: string): string | null => {
  if (role === "admin") {
    return null;
  }

  if (!company) {
    throw new AppError("company is required for company-admin and staff", 400);
  }

  if (!Types.ObjectId.isValid(company)) {
    throw new AppError("company must be a valid ObjectId", 400);
  }

  return company;
};

export const signupUser = async (data: SignupInput) => {
  const normalizedEmail = data.email.trim().toLowerCase();
  const role = resolveRole(data.role);
  const company = resolveCompany(role, data.company);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new AppError("Email already in use", 400);

  const password = await hashPassword(data.password);
  const user = await User.create({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: normalizedEmail,
    password,
    role,
    company,
  });

  const token = jwt.sign({ id: user._id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  const safeUser = toSafeAuthUser(user);

  return { user: safeUser, token };
};

export const loginUser = async (data: LoginInput) => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    "+password firstName lastName email role company"
  );
  if (!user) throw new AppError("Invalid credentials", 401);

  const isMatch = await comparePassword(data.password, user.password as string);
  if (!isMatch) throw new AppError("Invalid credentials", 401);

  const token = jwt.sign({ id: user._id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  const safeUser = toSafeAuthUser(user);

  return { user: safeUser, token };
};

export const updateCurrentUser = async (
  userId: string,
  data: UpdateCurrentUserInput
) => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const user = await User.findById(userId).select("_id firstName lastName email role company");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
  if (existingUser && String(existingUser._id) !== String(user._id)) {
    throw new AppError("Email already in use", 409);
  }

  user.firstName = data.firstName.trim();
  user.lastName = data.lastName.trim();
  user.email = normalizedEmail;

  await user.save();

  return toSafeAuthUser(user);
};