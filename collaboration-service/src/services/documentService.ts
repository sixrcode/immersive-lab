// import { getIO } from './socketService'; // If you need to emit socket events from here
import { IDocument, DocumentModel } from '../models/Document'; // Changed import
import mongoose, { Types, Schema } from 'mongoose'; // Import Types and Schema
import { getModels } from '../models'; // Added getModels import
import logger from '../logger'; // Import logger

/**
 * Service for handling document-related business logic.
 */
export const DocumentService = {
  async getDocumentById(documentId: string | Types.ObjectId): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findById(documentId)
        .populate('createdBy', 'username email')
        .populate('lastModifiedBy', 'username email');
      return document;
    } catch (error) {
      logger.error('Error fetching document by ID', { error, documentId });
      throw error; // Or handle more gracefully
    }
  },

  async getDocumentsByProjectId(projectId: string | Types.ObjectId): Promise<IDocument[]> {
    try {
      const documents = await getModels().Document.find({ projectId })
        .populate('createdBy', 'username email')
        .populate('lastModifiedBy', 'username email')
        .sort({ updatedAt: -1 });
      return documents;
    } catch (error) {
      logger.error('Error fetching documents by project ID', { error, projectId });
      throw error;
    }
  },

  async createDocument(
    title: string,
    projectId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    content: string = ''
  ): Promise<IDocument> {
    try {
      const document = new (getModels().Document)({ // Used getModels()
        title,
        projectId,
        content,
        createdBy: userId,
        lastModifiedBy: userId,
      });
      await document.save();
      // Example: Emit an event after creating a document (if using socketService directly)
      // getIO().to(projectId.toString()).emit('documentCreated', document);
      return document;
    } catch (error) {
      logger.error('Error creating document', { error, title, projectId, userId });
      throw error;
    }
  },

  async updateDocumentContent(
    documentId: string | Types.ObjectId,
    content: string,
    userId: string | Types.ObjectId
  ): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findById(documentId);
      if (!document) {
        return null; // Or throw an error
      }
      document.content = content;
      let userIdToAssign: Types.ObjectId; // This will hold an instance
      if (typeof userId === 'string') {
        userIdToAssign = new Types.ObjectId(userId);
      } else {
        userIdToAssign = userId; // userId is already Types.ObjectId (an instance)
      }
      document.lastModifiedBy = userIdToAssign; // Assigning instance to instance type
      await document.save();

      // Example: Emit an event after updating a document
      // getIO().to(document.projectId.toString()).emit('documentUpdated', {
      //   documentId: document._id,
      //   content: document.content,
      //   updatedBy: userId
      // });
      return document;
    } catch (error) {
      logger.error('Error updating document content', { error, documentId, userId });
      throw error;
    }
  },

  async deleteDocument(documentId: string | Types.ObjectId): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findByIdAndDelete(documentId);
      if (document) {
        // Example: Emit an event after deleting a document
        // getIO().to(document.projectId.toString()).emit('documentDeleted', { documentId: document._id });
      }
      return document;
    } catch (error) {
      logger.error('Error deleting document', { error, documentId });
      throw error;
    }
  }
};

// Note: For real-time collaboration, content updates would be more granular (e.g., Operational Transformation or CRDTs)
// and likely involve more complex logic within updateDocumentContent or a dedicated method.
// The socket emissions are placeholders; a robust implementation would have the socketService
// expose methods like `broadcastDocumentUpdate(projectId, documentData)` which this service would call.
