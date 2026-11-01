import { Request, Response, NextFunction } from "express";
import { getCompanyDashboardStats } from "../services/dashboard.service";
import { getStaffDashboardStats } from "../services/staff-dashboard.service";
import { getPlatformDashboardStats } from "../services/platform-dashboard.service";
import { AppError } from "../utils/appError";
import { apiResponse } from "../utils/apiResponse";
import { getErrorCode, getErrorMessage } from "../utils/errors";

/**
 * Controller to fetch all company admin dashboard analytical statistics.
 */
export async function getCompanyDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    
    // Enforce authentication context
    if (!user) {
      return next(new AppError("User context is missing", 401));
    }

    // Resolve tenant isolation: must be bound to a company
    const companyId = user.company || user.organizationId;
    if (!companyId) {
      return next(new AppError("Not authorized: No company bound to this account", 403));
    }

    // Read date range filter ("today" | "7d" | "30d" | "90d" | "custom")
    const range = typeof req.query.range === "string" ? req.query.range : "7d";

    const data = await getCompanyDashboardStats(companyId, range);

    return res.status(200).json({
      status: "success",
      message: "Dashboard analytics retrieved successfully",
      data,
    });
  } catch (error) {
    return next(new AppError(getErrorMessage(error) || "Internal server error during analytics compilation", 500));
  }
}

/**
 * Controller to fetch staff dashboard analytics.
 */
export async function getStaffDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      return next(new AppError("User context is missing", 401));
    }

    const companyId = user.company || user.organizationId;
    if (!companyId) {
      return next(new AppError("Not authorized: No company bound to this account", 403));
    }

    const data = await getStaffDashboardStats(companyId, user._id);
    return res.status(200).json({
      status: "success",
      message: "Staff dashboard analytics retrieved successfully",
      data,
    });
  } catch (error) {
    return next(
      new AppError(
        getErrorMessage(error) || "Internal server error during staff dashboard compilation",
        500
      )
    );
  }
}

/**
 * Controller to fetch platform admin dashboard analytics.
 */
export async function getPlatformDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      return next(new AppError("User context is missing", 401));
    }

    if (user.role !== "admin") {
      return next(new AppError("Not authorized to access platform dashboard", 403));
    }

    const data = await getPlatformDashboardStats();
    return res.status(200).json({
      status: "success",
      message: "Platform dashboard analytics retrieved successfully",
      data,
    });
  } catch (error) {
    return next(
      new AppError(
        getErrorMessage(error) || "Internal server error during platform dashboard compilation",
        500
      )
    );
  }
}
