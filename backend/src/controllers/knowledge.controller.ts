import { Request, Response } from "express";
import { randomUUID } from "crypto";

import * as fs from "fs/promises";
import mongoose from "mongoose";

import Organization from "../models/Organization";
import KnowledgeDocument from "../models/KnowledgeDocument";
import KnowledgeChunk from "../models/KnowledgeChunk";

import { parseDocumentText } from "../services/documentParser.service";
import { splitTextIntoChunks } from "../services/chunkText.service";
import { generateEmbeddings } from "../services/embedding.service";
import { getPineconeNamespace, upsertKnowledgeVectors, deleteKnowledgeVectors } from "../services/pinecone.service";

import { apiResponse } from "../utils/apiResponse";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

type AuthenticatedUser = {
  _id: string;
  company?: string | null;
  organizationId?: string | null;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "An unexpected error occurred while processing the document.";
};

const resolveOrganizationId = (req: Request): string => {
  const user = (req as any).user as AuthenticatedUser | undefined;
  const organizationId = user?.organizationId ?? user?.company;

  if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
    throw new AppError("Organization context is missing for this user", 400);
  }

  return String(organizationId);
};

const ensureOrganizationExists = async (organizationId: string): Promise<void> => {
  const organization = await Organization.findById(organizationId).select("_id").lean();

  if (!organization) {
    throw new AppError("Organization not found", 404);
  }
};

const deleteFileIfExists = async (filePath: string): Promise<void> => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return;
    }

    throw error;
  }
};

const toDocumentListItem = (document: any) => ({
  _id: String(document._id),
  originalName: document.originalName,
  title: document.title,
  category: document.category,
  mimeType: document.mimeType,
  fileSize: document.fileSize,
  status: document.status,
  totalChunks: document.totalChunks,
  errorMessage: document.errorMessage,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const uploadKnowledgeDocument = asyncHandler(async (req: Request, res: Response) => {
  const requester = (req as any).user as AuthenticatedUser | undefined;

  if (!requester?._id) {
    throw new AppError("Not authorized to upload knowledge documents", 401);
  }

  const organizationId = resolveOrganizationId(req);
  await ensureOrganizationExists(organizationId);

  const uploadedFile = (req as any).file as
    | {
        originalname: string;
        filename: string;
        mimetype: string;
        size: number;
        path: string;
      }
    | undefined;

  if (!uploadedFile) {
    throw new AppError("Please upload one PDF or DOCX file", 400);
  }

  const requestTitle = String(req.body?.title ?? "").trim();
  const requestCategory = String(req.body?.category ?? "").trim();
  const documentTitle = requestTitle || uploadedFile.originalname;
  const documentCategory = requestCategory || "General";

  const pineconeNamespace = getPineconeNamespace(organizationId);

  const knowledgeDocument = await KnowledgeDocument.create({
    organizationId,
    uploadedBy: requester._id,
    originalName: uploadedFile.originalname,
    title: documentTitle,
    category: documentCategory,
    storedName: uploadedFile.filename,
    mimeType: uploadedFile.mimetype,
    fileSize: uploadedFile.size,
    filePath: uploadedFile.path,
    status: "processing",
    totalChunks: 0,
    errorMessage: null,
    pineconeNamespace,
  });

  const createdVectorIds: string[] = [];

  try {
    const extractedText = await parseDocumentText(uploadedFile.path, uploadedFile.mimetype);
    const chunks = splitTextIntoChunks(extractedText);

    if (chunks.length === 0) {
      throw new AppError("Uploaded file does not contain enough readable text", 400);
    }

    const embeddings = await generateEmbeddings(chunks.map((chunk: any) => chunk.content));

    const vectors = chunks.map((chunk: any, index: number) => {
      const embeddingId = `doc_${String(knowledgeDocument._id)}_chunk_${chunk.chunkIndex}_${randomUUID()}`;
      createdVectorIds.push(embeddingId);

      return {
        id: embeddingId,
        values: embeddings[index],
        metadata: {
          organizationId,
          documentId: String(knowledgeDocument._id),
          chunkIndex: chunk.chunkIndex,
          originalName: uploadedFile.originalname,
          title: documentTitle,
          category: documentCategory,
          mimeType: uploadedFile.mimetype,
        },
      };
    });

    await upsertKnowledgeVectors(organizationId, vectors);

    await KnowledgeChunk.insertMany(
      chunks.map((chunk: any, index: number) => ({
        organizationId,
        documentId: knowledgeDocument._id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embeddings[index],
        embeddingId: vectors[index].id,
        tokenCount: chunk.tokenCount,
        metadata: {
          ...vectors[index].metadata,
          ...chunk.metadata,
        },
      }))
    );

    knowledgeDocument.status = "ready";
    knowledgeDocument.totalChunks = chunks.length;
    knowledgeDocument.errorMessage = null;
    knowledgeDocument.pineconeNamespace = pineconeNamespace;
    await knowledgeDocument.save();

    apiResponse(res, 201, "Document uploaded and processed successfully", {
      document: toDocumentListItem(knowledgeDocument),
    });
  } catch (error) {
    if (createdVectorIds.length > 0) {
      try {
        await deleteKnowledgeVectors(organizationId, createdVectorIds);
      } catch {
        // Best-effort cleanup to avoid leaking vectors when processing fails.
      }
    }

    await KnowledgeChunk.deleteMany({
      organizationId,
      documentId: knowledgeDocument._id,
    });

    knowledgeDocument.status = "failed";
    knowledgeDocument.totalChunks = 0;
    knowledgeDocument.errorMessage = toErrorMessage(error);
    await knowledgeDocument.save();

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(knowledgeDocument.errorMessage, 500);
  }
});

const listKnowledgeDocuments = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);

  const documents = await KnowledgeDocument.find({ organizationId })
    .sort({ createdAt: -1 })
    .select(
      "_id originalName title category mimeType fileSize status totalChunks errorMessage createdAt updatedAt"
    )
    .lean();

  apiResponse(res, 200, "Knowledge documents fetched successfully", {
    documents: documents.map(toDocumentListItem),
  });
});

const getKnowledgeDocument = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const documentId = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document id", 400);
  }

  const document = await KnowledgeDocument.findOne({
    _id: documentId,
    organizationId,
  })
    .select(
      "_id originalName title category mimeType fileSize status totalChunks errorMessage createdAt updatedAt"
    )
    .lean();

  if (!document) {
    throw new AppError("Knowledge document not found", 404);
  }

  const chunksCount = await KnowledgeChunk.countDocuments({
    organizationId,
    documentId,
  });

  apiResponse(res, 200, "Knowledge document fetched successfully", {
    document: {
      ...toDocumentListItem(document),
      chunksCount,
    },
  });
});

const deleteKnowledgeDocument = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = resolveOrganizationId(req);
  const documentId = String(req.params.id);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document id", 400);
  }

  const document = await KnowledgeDocument.findOne({
    _id: documentId,
    organizationId,
  });

  if (!document) {
    throw new AppError("Knowledge document not found", 404);
  }

  const chunks = await KnowledgeChunk.find({
    organizationId,
    documentId: document._id,
  })
    .select("embeddingId")
    .lean();

  try {
    await deleteKnowledgeVectors(
      organizationId,
      chunks.map((chunk: any) => chunk.embeddingId)
    );
  } catch (error) {
    throw new AppError("Failed to delete vectors from Pinecone", 502);
  }

  await KnowledgeChunk.deleteMany({ organizationId, documentId: document._id });
  await deleteFileIfExists(document.filePath);
  await KnowledgeDocument.deleteOne({ _id: document._id, organizationId });

  apiResponse(res, 200, "Knowledge document deleted successfully", {
    documentId: String(document._id),
  });
});

export {
  uploadKnowledgeDocument,
  listKnowledgeDocuments,
  getKnowledgeDocument,
  deleteKnowledgeDocument,
};
