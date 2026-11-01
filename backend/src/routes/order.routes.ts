const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { listOrders, updateOrderStatus } = require("../controllers/order.controller");

const router = express.Router();

router.get("/", protect, listOrders);
router.patch("/:orderId/status", protect, updateOrderStatus);

module.exports = router;

export {};
