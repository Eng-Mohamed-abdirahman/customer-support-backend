import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { validateApiKey } from "../middlewares/validateApiKey.middleware";
import { createTicket, listTickets, updateTicketStatus } from "../controllers/ticket.controller";

const router = express.Router();

router.post("/", validateApiKey, createTicket);
router.get("/", protect, listTickets);
router.patch("/:id/status", protect, updateTicketStatus);

export default router;

