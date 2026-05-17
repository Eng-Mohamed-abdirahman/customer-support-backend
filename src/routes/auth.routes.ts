import { Router } from "express";
import {
	getCurrentUser,
	login,
	signup,
	updateMyProfile,
} from "../controllers/auth.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getCurrentUser);
router.patch("/me", protect, updateMyProfile);

export default router;