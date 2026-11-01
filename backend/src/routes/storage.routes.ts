import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { getPresignedUploadUrl, uploadLogo } from "../controllers/storage.controller";
import upload from "../middlewares/upload";

const router = express.Router();

router.get("/presign", protect, getPresignedUploadUrl);
router.post("/upload", protect, upload.single("file"), uploadLogo);

export default router;

