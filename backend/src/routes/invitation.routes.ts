const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const {
  createInvitation,
  completeInvitationRegistration,
} = require("../controllers/invitation.controller");

const router = express.Router();

// Create/send invitation (authenticated inviter).
router.post("/", protect, createInvitation);

// Complete registration from invitation token.
router.post("/accept", authLimiter, completeInvitationRegistration);

module.exports = router;
