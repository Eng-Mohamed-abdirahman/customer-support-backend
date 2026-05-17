import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { signupUser, loginUser, updateCurrentUser } from "../services/auth.service";
import {
  signupSchema,
  loginSchema,
  updateCurrentUserSchema,
} from "../validators/auth.validator";
import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = signupSchema.safeParse(req.body);
  if (!result.success)
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request payload", 400);
  
  const data = await signupUser(result.data);
  apiResponse(res, 201, "User registered successfully", data);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success)
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request payload", 400);
  
  const data = await loginUser(result.data);
  apiResponse(res, 200, "User logged in successfully", data);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  if (!user) {
    throw new AppError("Not authorized to access this route", 401);
  }

  apiResponse(res, 200, "Current user fetched successfully", user);
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const requester = (req as any).user;

  if (!requester?._id) {
    throw new AppError("Not authorized to access this route", 401);
  }

  const result = updateCurrentUserSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message ?? "Invalid request payload", 400);
  }

  const updatedUser = await updateCurrentUser(String(requester._id), result.data);

  apiResponse(res, 200, "Profile updated successfully", updatedUser);
});