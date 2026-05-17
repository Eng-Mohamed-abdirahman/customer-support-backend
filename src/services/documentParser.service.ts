const fs = require("fs/promises");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const { AppError } = require("../utils/appError");

const SUPPORTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const normalizeDocumentText = (rawText: string): string => {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .trim();
};

const parsePdfFile = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const parsed = await pdfParse(fileBuffer);

  return normalizeDocumentText(parsed?.text ?? "");
};

const parseDocxFile = async (filePath: string): Promise<string> => {
  const fileBuffer = await fs.readFile(filePath);
  const parsed = await mammoth.extractRawText({ buffer: fileBuffer });

  return normalizeDocumentText(parsed?.value ?? "");
};

const parseDocumentText = async (filePath: string, mimeType: string): Promise<string> => {
  if (!SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
    throw new AppError("Only PDF and DOCX files are supported", 400);
  }

  const extractedText =
    mimeType === "application/pdf"
      ? await parsePdfFile(filePath)
      : await parseDocxFile(filePath);

  if (!extractedText) {
    throw new AppError("Uploaded file does not contain readable text", 400);
  }

  return extractedText;
};

module.exports = {
  parseDocumentText,
  normalizeDocumentText,
  SUPPORTED_DOCUMENT_MIME_TYPES,
};

export {};
