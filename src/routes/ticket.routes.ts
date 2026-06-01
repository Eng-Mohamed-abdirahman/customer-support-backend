const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const { createTicket, listTickets, updateTicketStatus } = require("../controllers/ticket.controller");

const router = express.Router();

router.post("/", validateApiKey, createTicket);
router.get("/", protect, listTickets);
router.patch("/:id/status", protect, updateTicketStatus);

module.exports = router;

export {};
