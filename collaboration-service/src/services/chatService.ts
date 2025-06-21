// import { getIO, broadcastToRoom } from './socketService'; // If you need to emit socket events from here
import { IChatMessage, ChatMessageModel } from '../models/ChatMessage'; // Changed import
import mongoose from 'mongoose';
import { getModels } from '../models'; // Added getModels import
import logger from '../logger'; // Import logger

/**
 * Service for handling chat-related business logic.
 */
export const ChatService = {
  async getMessagesForProject(
    projectId: string | mongoose.Types.ObjectId,
    limit: number = 50,
    before?: Date | string
  ): Promise<IChatMessage[]> {
    try {
      const query: any = { projectId };
      if (before) {
        query.timestamp = { $lt: typeof before === 'string' ? new Date(before) : before };
      }
      const messages = await getModels().ChatMessage.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('senderId', 'username email'); // Assuming 'username' and 'email' are fields in your User model

      return messages.reverse(); // Typically, you want to show the oldest of the batch first.
    } catch (error) {
      logger.error('Error fetching project messages', { error, projectId, limit, before });
      throw error;
    }
  },

  async getMessagesForDocument(
    documentId: string | mongoose.Types.ObjectId,
    limit: number = 50,
    before?: Date | string
  ): Promise<IChatMessage[]> {
    try {
      const query: any = { documentId };
      if (before) {
        query.timestamp = { $lt: typeof before === 'string' ? new Date(before) : before };
      }
      const messages = await getModels().ChatMessage.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate('senderId', 'username email');

      return messages.reverse();
    } catch (error) {
      logger.error('Error fetching document messages', { error, documentId, limit, before });
      throw error;
    }
  },

  async createMessage(
    projectId: string | mongoose.Types.ObjectId,
    senderId: string | mongoose.Types.ObjectId,
    messageText: string,
    documentId?: string | mongoose.Types.ObjectId | null
  ): Promise<IChatMessage> {
    try {
      const chatMessage = new (getModels().ChatMessage)({ // Used getModels()
        projectId,
        senderId,
        message: messageText,
        documentId: documentId || undefined, // Ensure it's undefined if null/empty
      });
      await chatMessage.save();
      await chatMessage.populate('senderId', 'username email');


      // After saving, broadcast the new message to the relevant room (e.g., project room)
      // This is where you'd integrate with socketService.
      // For example:
      // const room = documentId ? `document_${documentId}` : `project_${projectId}`;
      // getIO().to(projectId.toString()).emit('newChatMessage', chatMessage);
      // Or, if you have a more specific room for document chat:
      // if (documentId) {
      //   broadcastToRoom(documentId.toString(), 'newChatMessage', chatMessage);
      // } else {
      //   broadcastToRoom(projectId.toString(), 'newChatMessage', chatMessage);
      // }


      return chatMessage;
    } catch (error) {
      logger.error('Error creating message', { error, projectId, senderId, documentId });
      throw error;
    }
  },

  // Additional methods like deleteMessage or editMessage could be added if needed.
};

// Note: The socket emission examples (getIO, broadcastToRoom) assume that socketService
// exports these. You'd need to adjust based on how you structure inter-service communication
// or direct socket emissions from services. It's often cleaner for services to return data
// and have the route handlers (or a dedicated socket event handler in index.ts/socketService.ts)
// deal with broadcasting the events. This keeps services more focused on business logic.
