import { Request, Response, NextFunction } from "express";
import { getCompanyDashboardStats } from "../services/dashboard.service";
import { AppError } from "../utils/appError";
import { apiResponse } from "../utils/apiResponse";

/**
 * Controller to fetch all company admin dashboard analytical statistics.
 */
export async function getCompanyDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;
    
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
  } catch (error: any) {
    return next(new AppError(error?.message || "Internal server error during analytics compilation", 500));
  }
}
