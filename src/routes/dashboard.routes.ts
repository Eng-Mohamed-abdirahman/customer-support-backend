import express from "express";
import { protect } from "../middlewares/auth.middleware";
import {
  getCompanyDashboard,
  getPlatformDashboard,
  getStaffDashboard,
} from "../controllers/dashboard.controller";

const router = express.Router();

// Route: GET /api/dashboard/company
// Protected: requires user session
router.get("/company", protect, getCompanyDashboard);
router.get("/staff", protect, getStaffDashboard);
router.get("/platform", protect, getPlatformDashboard);

export default router;
