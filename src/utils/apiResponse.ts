import { Response } from "express";

export const apiResponse = (res: Response, statusCode: number, message: string, data: any = null) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};