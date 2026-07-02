import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";

export const requirePlatformAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user || user.role !== "admin") {
    return next(new AppError("Only platform admins can perform this action", 403));
  }

  next();
};

export const requireOrganizationMember = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return next(new AppError("Not authorized", 401));
  }

  if (user.role === "admin") {
    return next();
  }

  if (!user.company && !user.organizationId) {
    return next(new AppError("Organization context is required", 403));
  }

  next();
};

export const requireCompanyAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;

  if (!user) {
    return next(new AppError("Not authorized", 401));
  }

  if (user.role === "admin") {
    return next();
  }

  if (user.role !== "company-admin") {
    return next(new AppError("Only company admins can perform this action", 403));
  }

  if (!user.company && !user.organizationId) {
    return next(new AppError("Organization context is required", 403));
  }

  next();
};
