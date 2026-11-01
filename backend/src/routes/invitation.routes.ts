import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { authLimiter } from "../middlewares/rateLimit.middleware";
import { createInvitation, completeInvitationRegistration } from "../controllers/invitation.controller";

const router = express.Router();

// Create/send invitation (authenticated inviter).
router.post("/", protect, createInvitation);

// Complete registration from invitation token.
router.post("/accept", authLimiter, completeInvitationRegistration);

export default router;
