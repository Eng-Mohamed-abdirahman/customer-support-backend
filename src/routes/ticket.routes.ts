const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { createTicket, listTickets } = require("../controllers/ticket.controller");

const router = express.Router();

router.post("/", protect, createTicket);
router.get("/", protect, listTickets);

module.exports = router;

export {};
