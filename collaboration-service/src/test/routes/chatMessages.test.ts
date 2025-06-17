import request from 'supertest';
import { app, startServer, server as appServer, io as appIo } from '../../index';
import mongoose from 'mongoose';
import { getModels, initModels, IProject, IDocument, IChatMessage } from '../../models';

// Variable to hold the server instance for this test suite
let currentTestServer: import('http').Server;
let currentTestIo: import('socket.io').Server;

const mockUserId = new mongoose.Types.ObjectId().toString();
const anotherMockUserId = new mongoose.Types.ObjectId().toString(); // Added definition
let mockProjectId: string;
let mockDocumentId: string;

describe('Chat Message API Endpoints', () => {
  beforeAll(async () => {
    const globalMongooseInstance = (global as any).__MONGOOSE_INSTANCE__;
    if (!globalMongooseInstance) {
      throw new Error('Global Mongoose instance not found. globalSetup might have failed.');
    }
    initModels(globalMongooseInstance);
    console.log('Models initialized in chatMessages.test.ts beforeAll.');

    await startServer();
    currentTestServer = appServer;
    currentTestIo = appIo;

    const { Project, Document } = getModels();
    const project = await Project.create({ name: 'Chat Test Project', createdBy: mockUserId, members: [mockUserId] });
    mockProjectId = (project as any)._id.toString();

    const document = await Document.create({ title: 'Chat Test Document', projectId: mockProjectId, createdBy: mockUserId, lastModifiedBy: mockUserId });
    mockDocumentId = (document as any)._id.toString();
  });

  afterAll(async () => {
    // Close server
    await new Promise<void>(resolve => {
      if (currentTestIo) {
        currentTestIo.close(() => {
          if (currentTestServer && currentTestServer.listening) {
            currentTestServer.close(() => resolve());
          } else { resolve(); }
        });
      } else if (currentTestServer && currentTestServer.listening) {
        currentTestServer.close(() => resolve());
      } else { resolve(); }
    });

    // Clean up created project and document
    const { Project, Document } = getModels();
    if (mockProjectId) await Project.findByIdAndDelete(mockProjectId);
    // Documents and ChatMessages should be cleaned by afterEach if they are specific to project/document
    // or if not, could be targeted here. For now, afterEach in setup.ts handles general cleanup.
  });

  beforeEach(async () => {
    const { ChatMessage } = getModels();
    // Clear chat messages before each test, specific to the project or document
    // This is important if tests post messages and expect specific counts.
    await ChatMessage.deleteMany({ $or: [{ projectId: mockProjectId }, { documentId: mockDocumentId }] });
  });

  // --- Project Chat Tests ---
  describe('POST /api/chats/projects/:projectId/chats', () => {
    it('should post a new chat message to a project and return 201', async () => {
      const chatData = {
        message: 'Hello Project!',
        senderId: mockUserId,
      };
      const response = await request(app)
        .post(`/api/chats/projects/${mockProjectId}/chats`)
        .send(chatData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe(chatData.message);
      expect(response.body.senderId).toBe(mockUserId);
      expect(response.body.projectId).toBe(mockProjectId);

      const { ChatMessage } = getModels();
      const messagesInDb = await ChatMessage.find({ projectId: mockProjectId });
      expect(messagesInDb.length).toBe(1);
      expect(messagesInDb[0].message).toBe(chatData.message);
    });

    it('should return 404 if project not found for posting project chat', async () => {
      const nonExistentProjectId = new mongoose.Types.ObjectId().toString();
      const chatData = { message: 'Test', senderId: mockUserId };
      const response = await request(app)
        .post(`/api/chats/projects/${nonExistentProjectId}/chats`)
        .send(chatData);
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/chats/projects/:projectId/chats', () => {
    it('should get all chat messages for a project', async () => {
      const { ChatMessage } = getModels();
      await ChatMessage.create([
        { projectId: mockProjectId, senderId: mockUserId, message: 'Msg1' },
        { projectId: mockProjectId, senderId: anotherMockUserId, message: 'Msg2' },
      ]);

      const response = await request(app).get(`/api/chats/projects/${mockProjectId}/chats`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  // --- Document Chat Tests (Comments) ---
  // Note: The routes file uses POST /api/projects/:projectId/chats for document messages too,
  // by including an optional documentId in the body.
  // A dedicated POST /api/chats/documents/:documentId/chats might be cleaner if desired later.
  // For GET, it's /api/documents/:documentId/chats

  describe('POST for document comments (via project chat route with documentId)', () => {
    it('should post a new chat message linked to a document and return 201', async () => {
      const chatData = {
        message: 'Hello Document!',
        senderId: mockUserId,
        documentId: mockDocumentId, // Linking to the document
      };
      const response = await request(app)
        .post(`/api/chats/projects/${mockProjectId}/chats`) // Still uses project chat route
        .send(chatData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe(chatData.message);
      expect(response.body.senderId).toBe(mockUserId);
      expect(response.body.projectId).toBe(mockProjectId);
      expect(response.body.documentId).toBe(mockDocumentId);

      const { ChatMessage } = getModels();
      const messagesInDb = await ChatMessage.find({ documentId: mockDocumentId });
      expect(messagesInDb.length).toBe(1);
      expect(messagesInDb[0].message).toBe(chatData.message);
    });
  });

  describe('GET /api/chats/documents/:documentId/chats', () => {
    it('should get all chat messages for a specific document', async () => {
      const { ChatMessage } = getModels();
      await ChatMessage.create([
        { projectId: mockProjectId, documentId: mockDocumentId, senderId: mockUserId, message: 'Comment1' },
        { projectId: mockProjectId, documentId: mockDocumentId, senderId: anotherMockUserId, message: 'Comment2' },
      ]);

      const response = await request(app).get(`/api/chats/documents/${mockDocumentId}/chats`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body.every((msg: IChatMessage) => msg.documentId?.toString() === mockDocumentId)).toBe(true);
    });
  });
});
