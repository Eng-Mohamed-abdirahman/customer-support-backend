const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { getPresignedUploadUrl } = require("../controllers/storage.controller");

const router = express.Router();

router.get("/presign", protect, getPresignedUploadUrl);

module.exports = router;

export {};