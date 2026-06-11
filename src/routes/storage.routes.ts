const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { getPresignedUploadUrl, uploadLogo, uploadMiddleware } = require("../controllers/storage.controller");

const router = express.Router();

router.get("/presign", protect, getPresignedUploadUrl);
router.post("/upload", protect, uploadMiddleware, uploadLogo);

module.exports = router;

export {};