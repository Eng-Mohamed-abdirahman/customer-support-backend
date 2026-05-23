const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { validateApiKey } = require("../middlewares/validateApiKey.middleware");
const { createTicket, listTickets } = require("../controllers/ticket.controller");

const router = express.Router();

router.post("/", validateApiKey, createTicket);
router.get("/", protect, listTickets);

module.exports = router;

export {};
