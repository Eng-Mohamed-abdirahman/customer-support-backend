const express = require("express");

const { protect } = require("../middlewares/auth.middleware");
const {
  listContacts,
  getContactByPhone,
  createContact,
  updateContact,
  deleteContact,
} = require("../controllers/contact.controller");

const router = express.Router();

router.get("/", protect, listContacts);
router.get("/by-phone/:phone", protect, getContactByPhone);
router.post("/", protect, createContact);
router.patch("/:id", protect, updateContact);
router.delete("/:id", protect, deleteContact);

module.exports = router;

export {};
