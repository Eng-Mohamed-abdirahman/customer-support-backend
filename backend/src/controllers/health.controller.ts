import { Request, Response } from "express";
import { apiResponse } from "../utils/apiResponse";

export const healthCheck = (req: Request, res: Response) => {
  apiResponse(res, 200, "API is running");
};