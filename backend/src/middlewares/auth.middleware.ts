import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import User from "../models/User";

/** The signed-in user set by `protect`; throws 401 if the route is missing `protect`. */
export const getAuthenticatedUser = (req: Request) => {
  if (!req.user) {
    throw new AppError("Not authorized to access this route", 401);
  }
  return req.user;
};

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next(new AppError("Not authorized to access this route", 401));

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as { id?: string };
    if (!decoded.id) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    const user = await User.findById(decoded.id).select(
      "_id firstName lastName email role company"
    );
    if (!user) return next(new AppError("User not found", 404));

    req.user = {
      _id: String(user._id),
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      email: user.email,
      role: user.role,
      organizationId: user.company ? String(user.company) : null,
      company: user.company ? String(user.company) : null,
      accountId: user.company ? String(user.company) : null,
    };
    next();
  } catch (err) {
    return next(new AppError("Not authorized to access this route", 401));
  }
};