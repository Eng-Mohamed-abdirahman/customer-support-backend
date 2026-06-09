import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
const multer = require("multer");

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err?.statusCode || 500;
  let message = err?.message || "Server Error";
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File size exceeds 10MB limit";
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors).map((val: any) => val.message).join(", ");
  }

  if (err.code === 11000) {
    statusCode = 400;
    const duplicateField = Object.keys(err.keyPattern ?? {})[0];
    if (duplicateField === "phoneNumberId") {
      message = "This WhatsApp phone number is already connected to another workspace";
    } else if (duplicateField === "organizationId") {
      message =
        "This organization already has a WhatsApp connection. Disconnect the old number first or restart the backend to apply the latest database fix.";
    } else {
      message = duplicateField
        ? `Duplicate value for ${duplicateField}`
        : "Duplicate field value entered";
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId
  });
};