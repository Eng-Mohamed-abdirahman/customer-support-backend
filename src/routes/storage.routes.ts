const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { getPresignedUploadUrl, uploadLogo } = require("../controllers/storage.controller");
const upload = require("../middlewares/upload").default;

const router = express.Router();

router.get("/presign", protect, getPresignedUploadUrl);
router.post("/upload", protect, upload.single("file"), uploadLogo);

module.exports = router;

export {};