import { Mongoose } from 'mongoose';
import { ProjectModel, defineProjectModel, IProject } from './Project';
import { DocumentModel, defineDocumentModel, IDocument } from './Document';
import { ChatMessageModel, defineChatMessageModel, IChatMessage } from './ChatMessage';

export interface IModels {
  Project: ProjectModel;
  Document: DocumentModel;
  ChatMessage: ChatMessageModel;
}

let models: IModels | null = null;

export const initModels = (mongooseInstance: Mongoose): IModels => {
  if (models) {
    // console.warn('Models already initialized. Returning existing models.');
    return models;
  }
  console.log('Initializing models with provided mongoose instance...');
  models = {
    Project: defineProjectModel(mongooseInstance),
    Document: defineDocumentModel(mongooseInstance),
    ChatMessage: defineChatMessageModel(mongooseInstance),
  };
  console.log('Models initialized.');
  return models;
};

export const getModels = (): IModels => {
  if (!models) {
    throw new Error('Models not initialized. Call initModels() first with a Mongoose instance.');
  }
  return models;
};

// Re-export main interfaces/types if needed
export type { IProject, ProjectModel, IDocument, DocumentModel, IChatMessage, ChatMessageModel };
