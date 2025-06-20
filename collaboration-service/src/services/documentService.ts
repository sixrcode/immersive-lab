// import { getIO } from './socketService'; // If you need to emit socket events from here
import { IDocument, DocumentModel } from '../models/Document'; // Changed import
import mongoose from 'mongoose';
import { getModels } from '../models'; // Added getModels import

/**
 * Service for handling document-related business logic.
 */
export const DocumentService = {
  async getDocumentById(documentId: string | mongoose.Types.ObjectId): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findById(documentId)
        .populate('createdBy', 'username email')
        .populate('lastModifiedBy', 'username email');
      return document;
    } catch (error) {
      console.error('Error fetching document by ID:', error);
      throw error; // Or handle more gracefully
    }
  },

  async getDocumentsByProjectId(projectId: string | mongoose.Types.ObjectId): Promise<IDocument[]> {
    try {
      const documents = await getModels().Document.find({ projectId })
        .populate('createdBy', 'username email')
        .populate('lastModifiedBy', 'username email')
        .sort({ updatedAt: -1 });
      return documents;
    } catch (error) {
      console.error('Error fetching documents by project ID:', error);
      throw error;
    }
  },

  async createDocument(
    title: string,
    projectId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
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
      console.error('Error creating document:', error);
      throw error;
    }
  },

  async updateDocumentContent(
    documentId: string | mongoose.Types.ObjectId,
    content: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findById(documentId);
      if (!document) {
        return null; // Or throw an error
      }
      document.content = content;
      document.lastModifiedBy = userId as mongoose.Types.ObjectId; // Cast needed if userId is string
      await document.save();

      // Example: Emit an event after updating a document
      // getIO().to(document.projectId.toString()).emit('documentUpdated', {
      //   documentId: document._id,
      //   content: document.content,
      //   updatedBy: userId
      // });
      return document;
    } catch (error) {
      console.error('Error updating document content:', error);
      throw error;
    }
  },

  async deleteDocument(documentId: string | mongoose.Types.ObjectId): Promise<IDocument | null> {
    try {
      const document = await getModels().Document.findByIdAndDelete(documentId);
      if (document) {
        // Example: Emit an event after deleting a document
        // getIO().to(document.projectId.toString()).emit('documentDeleted', { documentId: document._id });
      }
      return document;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
};

// Note: For real-time collaboration, content updates would be more granular (e.g., Operational Transformation or CRDTs)
// and likely involve more complex logic within updateDocumentContent or a dedicated method.
// The socket emissions are placeholders; a robust implementation would have the socketService
// expose methods like `broadcastDocumentUpdate(projectId, documentData)` which this service would call.
