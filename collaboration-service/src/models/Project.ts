import { Schema, Document, Model, Mongoose } from 'mongoose'; // Keep Mongoose for types

export interface IProject extends Document {
  name: string;
  description?: string;
  createdBy: Schema.Types.ObjectId; // User ID // Made this required as per original schema for tests
  members?: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectModel = Model<IProject>;

export const defineProjectModel = (mongooseInstance: Mongoose): ProjectModel => {
  const projectSchemaDefinition: SchemaDefinition<IProject> = { // Explicitly type schema definition
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: mongooseInstance.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongooseInstance.Schema.Types.ObjectId, ref: 'User' }],
  };

  const projectSchema = new mongooseInstance.Schema<IProject>(
    projectSchemaDefinition,
    { timestamps: true }
  );

  // Ensure the model is not recompiled if it already exists on this mongoose instance
  return (mongooseInstance.models.Project as ProjectModel) || mongooseInstance.model<IProject>('Project', projectSchema);
};

// Helper type for schema definition if you want more specific typing, optional
type SchemaDefinition<T> = {
  [P in keyof T]?: any; // Simplified for brevity, can be more specific
};
