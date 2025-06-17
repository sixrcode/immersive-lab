import { Schema, Document, Model, Mongoose } from 'mongoose';

export interface IChatMessage extends Document {
  projectId: Schema.Types.ObjectId;
  documentId?: Schema.Types.ObjectId;
  senderId: Schema.Types.ObjectId;
  message: string;
  timestamp: Date; // This will be handled by timestamps: { createdAt: 'timestamp' }
}

export type ChatMessageModel = Model<IChatMessage>;

export const defineChatMessageModel = (mongooseInstance: Mongoose): ChatMessageModel => {
  const chatMessageSchemaDefinition = {
    projectId: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'Project', required: true },
    documentId: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'Document' },
    senderId: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true },
  };

  const chatMessageSchema = new mongooseInstance.Schema<IChatMessage>(
    chatMessageSchemaDefinition,
    { timestamps: { createdAt: 'timestamp', updatedAt: false } } // Only createdAt, aliased to 'timestamp'
  );

  // Ensure 'timestamp' field is explicitly part of the schema if not using default 'createdAt'
  // Mongoose's `timestamps: { createdAt: 'timestamp' }` handles this.

  return (mongooseInstance.models.ChatMessage as ChatMessageModel) || mongooseInstance.model<IChatMessage>('ChatMessage', chatMessageSchema);
};
