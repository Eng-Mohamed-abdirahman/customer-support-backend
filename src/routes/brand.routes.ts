const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const { saveBrandIdentity, getCurrentBrandIdentity } = require("../controllers/brand.controller");

const router = express.Router();

router.post("/", protect, saveBrandIdentity);
router.get("/current", protect, getCurrentBrandIdentity);

module.exports = router;

export {};