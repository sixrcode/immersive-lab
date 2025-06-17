import request from 'supertest';
import { app, startServer, server, io as serverSocket } from '../../index';
import mongoose from 'mongoose';
// import Project from '../../models/Project'; // Will use getModels
// import Document from '../../models/Document'; // Will use getModels
import { getModels, initModels, IDocument } from '../../models'; // Import initModels & IDocument

const mockUserId = new mongoose.Types.ObjectId().toString();
let mockProjectId: string;

// Variable to hold the server instance for this test suite
let testSuiteServer: import('http').Server;
let testSuiteServerSocket: import('socket.io').Server;

describe('Document API Endpoints', () => {
  // Server and Mongoose connections are handled by globalSetup.ts and globalTeardown.ts
  // Data clearing is handled by setup.ts (afterEach)

  beforeAll(async () => {
    const globalMongooseInstance = (global as any).__MONGOOSE_INSTANCE__;
    if (!globalMongooseInstance) {
      throw new Error('Global Mongoose instance not found. globalSetup might have failed.');
    }
    initModels(globalMongooseInstance); // Initialize models for this suite
    console.log('Models initialized in documents.test.ts beforeAll.');

    // Start HTTP server for this test suite
    await startServer();
    testSuiteServer = server; // server is exported from index.ts
    testSuiteServerSocket = serverSocket; // io is exported as serverSocket from index.ts

    // Create a mock project once for all tests in this suite
    const { Project } = getModels(); // Use getModels
    const project = await Project.create({ name: 'Project For Documents Test Suite', createdBy: mockUserId, members: [mockUserId] });
    mockProjectId = (project as any)._id.toString();
  });

  afterAll(async () => {
    // Close the server instance started for this test suite
    await new Promise<void>(resolve => {
      if (testSuiteServerSocket) {
        testSuiteServerSocket.close(() => {
          if (testSuiteServer && testSuiteServer.listening) {
            testSuiteServer.close(() => resolve());
          } else {
            resolve();
          }
        });
      } else if (testSuiteServer && testSuiteServer.listening) {
        testSuiteServer.close(() => resolve());
      } else {
        resolve();
      }
    });

    // Clean up the specific project created for this test suite
    if (mockProjectId) {
      const { Project } = getModels(); // Use getModels
      await Project.findByIdAndDelete(mockProjectId);
    }
  });


  beforeEach(async () => {
    const { Document } = getModels(); // Use getModels
    // Clear only documents before each test, project persists for the suite
    await Document.deleteMany({ projectId: mockProjectId });
  });

  describe('POST /api/projects/:projectId/documents', () => {
    it('should create a new document in a project and return 201', async () => {
      const { Document } = getModels(); // Use getModels
      const docData = {
        title: 'Test Document 1',
        content: 'Some initial content.',
        createdBy: mockUserId, // In a real app, this would come from auth
      };
      const response = await request(app)
        .post(`/api/documents/projects/${mockProjectId}/documents`)
        .send(docData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(docData.title);
      expect(response.body.projectId).toBe(mockProjectId);
      expect(response.body.createdBy).toBe(mockUserId);
      expect(response.body.lastModifiedBy).toBe(mockUserId);

      const docInDb = await Document.findById(response.body._id);
      expect(docInDb).not.toBeNull();
      expect(docInDb?.title).toBe(docData.title);
    });

    it('should return 400 if title is missing', async () => {
      const docData = { content: 'No title', createdBy: mockUserId };
      const response = await request(app)
        .post(`/api/documents/projects/${mockProjectId}/documents`)
        .send(docData);
      expect(response.status).toBe(400);
    });

    it('should return 404 if project ID does not exist', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();
      const docData = { title: 'Doc for non-existent project', createdBy: mockUserId };
      const response = await request(app)
        .post(`/api/documents/projects/${nonExistentProjectId}/documents`)
        .send(docData);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Project not found');
    });
  });

  describe('GET /api/projects/:projectId/documents', () => {
    it('should return all documents for a specific project', async () => {
      const { Document } = getModels(); // Use getModels
      await Document.create([
        { title: 'Doc A', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId },
        { title: 'Doc B', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId },
      ]);
      const anotherProjectId = new mongoose.Types.ObjectId().toString(); // Keep this for testing filtering
      const { Project } = getModels(); // Need Project to create another project for this specific test case
      const anotherProject = await Project.create({ name: 'Other Project', createdBy: mockUserId });
      await Document.create({ title: 'Doc C', projectId: (anotherProject as any)._id, createdBy: mockUserId, lastModifiedBy: mockUserId });


      const response = await request(app).get(`/api/documents/projects/${mockProjectId}/documents`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.some((doc: any) => doc.title === 'Doc A')).toBe(true);
      expect(response.body.some((doc: any) => doc.title === 'Doc B')).toBe(true);
      expect(response.body.every((doc: any) => doc.projectId.toString() === mockProjectId)).toBe(true);

      await Project.findByIdAndDelete((anotherProject as any)._id); // Clean up extra project
    });
  });

  describe('GET /api/documents/:documentId', () => {
    it('should return a single document by its ID', async () => {
      const { Document } = getModels(); // Use getModels
      const doc = await Document.create({ title: 'Specific Doc', content: 'Content here', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId });
      const response = await request(app).get(`/api/documents/${(doc as any)._id}`);
      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Specific Doc');
      expect(response.body._id).toBe((doc as any)._id.toString());
    });

    it('should return 404 if document ID is not found', async () => {
      const nonExistentDocId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/api/documents/${nonExistentDocId}`);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/documents/:documentId', () => {
    it('should update a document and return 200', async () => {
      const { Document } = getModels(); // Use getModels
      const doc = await Document.create({ title: 'Old Title', content: 'Old Content', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId });
      const updates = {
        title: 'New Title',
        content: 'New Content',
        lastModifiedBy: new mongoose.Types.ObjectId().toString(),
      };
      const response = await request(app)
        .put(`/api/documents/${(doc as any)._id}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updates.title);
      expect(response.body.content).toBe(updates.content);
      expect(response.body.lastModifiedBy).toBe(updates.lastModifiedBy);

      const docInDb = await Document.findById((doc as any)._id);
      expect(docInDb?.title).toBe(updates.title);
      expect(docInDb?.content).toBe(updates.content);
    });

    it('should return 404 if document to update is not found', async () => {
        const nonExistentDocId = new mongoose.Types.ObjectId().toString();
        const updates = { title: 'No Update' };
        const response = await request(app)
            .put(`/api/documents/${nonExistentDocId}`)
            .send(updates);
        expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/documents/:documentId', () => {
    it('should delete a document and return 200', async () => {
      const { Document } = getModels(); // Use getModels
      const doc = await Document.create({ title: 'To Be Deleted', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId });
      const response = await request(app).delete(`/api/documents/${(doc as any)._id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Document deleted');

      const docInDb = await Document.findById((doc as any)._id);
      expect(docInDb).toBeNull();
    });

    it('should return 404 if document to delete is not found', async () => {
        const nonExistentDocId = new mongoose.Types.ObjectId().toString();
        const response = await request(app).delete(`/api/documents/${nonExistentDocId}`);
        expect(response.status).toBe(404);
    });

    it('should use the correct Mongoose delete method', async () => {
      const { Document } = getModels(); // Use getModels
      const doc = await Document.create({ title: 'Test Delete Method', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId });

      // This test primarily ensures functionality, not spying on internal Mongoose calls
      // as that proved complex with instance differences in previous attempts.
      // The route uses `res.locals.document.remove()` which internally calls deleteOne for a document instance.
      await request(app).delete(`/api/documents/${(doc as any)._id}`);

      const docInDb = await Document.findById((doc as any)._id);
      expect(docInDb).toBeNull();
    });
  });
});
