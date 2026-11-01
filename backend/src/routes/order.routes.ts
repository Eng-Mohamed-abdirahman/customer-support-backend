import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { listOrders, updateOrderStatus } from "../controllers/order.controller";

const router = express.Router();

router.get("/", protect, listOrders);
router.patch("/:orderId/status", protect, updateOrderStatus);

export default router;

