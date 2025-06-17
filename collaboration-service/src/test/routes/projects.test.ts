import request from 'supertest';
import mongoose from 'mongoose';
import { app, startServer, server as appServer, io as appIo } from '../../index';
import { getModels, initModels, IProject } from '../../models'; // Import initModels & IProject

// Variable to hold the server instance for this test suite
let currentTestServer: import('http').Server;
let currentTestIo: import('socket.io').Server;

const mockUserId = new mongoose.Types.ObjectId().toString();
const anotherMockUserId = new mongoose.Types.ObjectId().toString();

describe('Project API Endpoints (with Refactored Models)', () => {
  beforeAll(async () => {
    const globalMongooseInstance = (global as any).__MONGOOSE_INSTANCE__;
    if (!globalMongooseInstance) {
      throw new Error('Global Mongoose instance not found in projects.test.ts beforeAll. globalSetup might have failed.');
    }
    // Initialize models for this test suite using the global mongoose instance
    initModels(globalMongooseInstance);
    console.log('Models initialized in projects.test.ts beforeAll.');

    // Start the HTTP server for this test suite
    await startServer(); // Assumes startServer is idempotent or safe to call if already started (it is not, this needs care)
                         // Or, if startServer is meant to be called once, this logic needs to ensure it.
                         // For this refactor: startServer will be called, using the global server/io instances from index.ts
    currentTestServer = appServer;
    currentTestIo = appIo;
  });

  afterAll(async () => {
    // Close the server instance for this test suite
    await new Promise<void>(resolve => {
      if (currentTestIo) {
        currentTestIo.close(() => {
          if (currentTestServer && currentTestServer.listening) {
            currentTestServer.close(() => resolve());
          } else { resolve(); }
        });
      } else if (currentTestServer && currentTestServer.listening) {
        currentTestServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  beforeEach(async () => {
    const { Project } = getModels();
    await Project.deleteMany({});
  });

  describe('POST /api/projects', () => {
    it('should create a new project and return 201', async () => {
      const { Project } = getModels(); // Get model within the test
      const projectData = {
        name: 'Test Project 1',
        description: 'A project for testing',
        createdBy: mockUserId,
      };
      const response = await request(app) // 'app' is imported from index.ts
        .post('/api/projects')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(projectData.name);
      // ... other assertions from original test ...
      const projectInDb = await Project.findById(response.body._id);
      expect(projectInDb).not.toBeNull();
      expect(projectInDb?.name).toBe(projectData.name);
    });

    it('should return 400 if name is missing', async () => {
      const projectData = { description: 'Missing name', createdBy: mockUserId };
      const response = await request(app).post('/api/projects').send(projectData);
      expect(response.status).toBe(400);
    });

     it('should return 400 if createdBy is missing', async () => {
      const projectData = { name: 'Missing creator', description: 'A project for testing' };
      const response = await request(app).post('/api/projects').send(projectData);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should return an array of projects', async () => {
      const { Project } = getModels();
      await Project.create([
        { name: 'Project Alpha', createdBy: mockUserId, members: [mockUserId] },
        { name: 'Project Beta', createdBy: mockUserId, members: [mockUserId] },
      ]);

      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should return a single project if ID is valid', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Gamma', createdBy: mockUserId, members: [mockUserId] });
      const response = await request(app).get(`/api/projects/${(project as any)._id}`);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Project Gamma');
    });

    it('should return 404 if project ID is not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app).get(`/api/projects/${nonExistentId}`);
      expect(response.status).toBe(404);
    });

    it('should return 500 if project ID is invalid', async () => {
        const invalidId = 'invalid-id-format';
        const response = await request(app).get(`/api/projects/${invalidId}`);
        expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('should update a project and return 200', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Delta', description: 'Original Desc', createdBy: mockUserId });
      const updates = { name: 'Project Delta Updated', description: 'Updated Desc' };
      const response = await request(app)
        .put(`/api/projects/${(project as any)._id}`)
        .send(updates);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project and return 200', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Epsilon', createdBy: mockUserId });
      const response = await request(app).delete(`/api/projects/${(project as any)._id}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project deleted');
    });
  });

  // --- Project Membership Tests ---
  describe('POST /api/projects/:projectId/members', () => {
    it('should add a member to a project and return 201', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Membership Project', createdBy: mockUserId, members: [mockUserId] }) as IProject;
      const response = await request(app)
        .post(`/api/projects/${(project as any)._id}/members`)
        .send({ userId: anotherMockUserId });
      expect(response.status).toBe(201);
      expect(response.body.members).toContain(anotherMockUserId);
    });
  });

  describe('DELETE /api/projects/:projectId/members/:userId', () => {
    it('should remove a member from a project and return 200', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Remove Member Project', createdBy: mockUserId, members: [mockUserId, anotherMockUserId] });
      const response = await request(app)
        .delete(`/api/projects/${(project as any)._id}/members/${anotherMockUserId}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member removed');
    });
  });
});
