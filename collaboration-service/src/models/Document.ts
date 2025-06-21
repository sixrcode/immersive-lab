import { Schema, Document, Model, Mongoose, Types } from 'mongoose'; // Import Types

export interface IDocument extends Document {
  title: string;
  content: string;
  projectId: Types.ObjectId; // Use Types.ObjectId for instances
  createdBy: Types.ObjectId; // Use Types.ObjectId for instances
  lastModifiedBy: Types.ObjectId; // Use Types.ObjectId for instances
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentModel = Model<IDocument>;

export const defineDocumentModel = (mongooseInstance: Mongoose): DocumentModel => {
  const documentSchemaDefinition = {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    projectId: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'Project', required: true },
    createdBy: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'User', required: true },
    lastModifiedBy: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'User', required: true },
  };

  const documentSchema = new mongooseInstance.Schema<IDocument>(
    documentSchemaDefinition,
    { timestamps: true }
  );

  return (mongooseInstance.models.Document as DocumentModel) || mongooseInstance.model<IDocument>('Document', documentSchema);
};
