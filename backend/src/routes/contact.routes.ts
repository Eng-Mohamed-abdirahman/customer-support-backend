import express from "express";

import { protect } from "../middlewares/auth.middleware";
import { listContacts, getContactByPhone, createContact, updateContact, deleteContact } from "../controllers/contact.controller";

const router = express.Router();

router.get("/", protect, listContacts);
router.get("/by-phone/:phone", protect, getContactByPhone);
router.post("/", protect, createContact);
router.patch("/:id", protect, updateContact);
router.delete("/:id", protect, deleteContact);

export default router;

