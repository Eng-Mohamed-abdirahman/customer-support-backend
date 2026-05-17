import path from "path";

const fs = require("fs");
const multer = require("multer");

const { AppError } = require("../utils/appError");
const { SUPPORTED_DOCUMENT_MIME_TYPES } = require("../services/documentParser.service");

const MAX_KNOWLEDGE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const KNOWLEDGE_UPLOAD_DIR = path.join(process.cwd(), "uploads", "knowledge");

if (!fs.existsSync(KNOWLEDGE_UPLOAD_DIR)) {
  fs.mkdirSync(KNOWLEDGE_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, KNOWLEDGE_UPLOAD_DIR);
  },
  filename: (_req: any, file: any, cb: any) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  if (!SUPPORTED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    cb(
      new AppError(
        "Invalid file type. Only PDF and DOCX files are allowed.",
        400
      )
    );
    return;
  }

  cb(null, true);
};

const uploadKnowledgeDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_KNOWLEDGE_FILE_SIZE_BYTES,
  },
}).single("file");

module.exports = {
  uploadKnowledgeDocument,
  MAX_KNOWLEDGE_FILE_SIZE_BYTES,
  KNOWLEDGE_UPLOAD_DIR,
};

export {};
