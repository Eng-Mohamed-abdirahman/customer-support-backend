import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { saveBrandIdentity, getCurrentBrandIdentity } from "../controllers/brand.controller";

const router = express.Router();

router.post("/", protect, saveBrandIdentity);
router.get("/current", protect, getCurrentBrandIdentity);

export default router;

