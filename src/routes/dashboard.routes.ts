import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { getCompanyDashboard } from "../controllers/dashboard.controller";

const router = express.Router();

// Route: GET /api/dashboard/company
// Protected: requires user session
router.get("/company", protect, getCompanyDashboard);

export default router;
