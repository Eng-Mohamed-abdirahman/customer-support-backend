import { Router } from "express";
import {
	getCurrentUser,
	login,
	signup,
	updateMyProfile,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.get("/me", protect, getCurrentUser);
router.patch("/me", protect, updateMyProfile);

export default router;