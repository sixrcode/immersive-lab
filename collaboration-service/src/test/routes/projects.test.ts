import request from 'supertest';
import mongoose from 'mongoose';
import { app, startServer, server as appServer, io as appIo } from '../../index';
import { getModels, initModels, IProject } from '../../models'; // Import initModels & IProject
import * as firestoreSyncService from '../../services/firestoreSyncService'; // To spy on its methods
// import { db as testFirestoreDb } from '../../firebaseAdmin'; // To interact with Firestore if possible - Placeholder for now

// Mock the service methods to check if they are called
jest.mock('../../services/firestoreSyncService', () => ({
  ...jest.requireActual('../../services/firestoreSyncService'), // Import and retain default behavior
  handleProjectDeleted: jest.fn().mockResolvedValue(undefined), // Mock to check calls
  handleProjectRenamed: jest.fn().mockResolvedValue(undefined), // Mock to check calls
}));

jest.mock('../../firebaseAdmin', () => {
  const actualAdmin = jest.requireActual('../../firebaseAdmin');
  return {
    ...actualAdmin, // Spread actual exports
    __esModule: true, // This is important for ES modules
    default: { // Mock the default export
      ...actualAdmin.default,
      auth: () => ({ // Mock the auth method
        verifyIdToken: jest.fn(),
      }),
    },
    // If there are other named exports you want to mock or keep, handle them here
  };
});
import admin from '../../firebaseAdmin'; // Import the mocked admin

// Variable to hold the server instance for this test suite
let currentTestServer: import('http').Server;
let currentTestIo: import('socket.io').Server;

const mockUserId = new mongoose.Types.ObjectId().toString();
const anotherMockUserId = new mongoose.Types.ObjectId().toString();
const thirdMockUserId = new mongoose.Types.ObjectId().toString();

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
    // Default mock for successful authentication for most tests
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: mockUserId, email: 'test@example.com' });
  });

  describe('POST /api/projects', () => {
    it('should create a new project and return 201', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: mockUserId, email: 'test@example.com' });
      const { Project } = getModels(); // Get model within the test
      const projectData = {
        name: 'Test Project 1',
        description: 'A project for testing',
        // createdBy is now automatically set via auth
      };
      const response = await request(app) // 'app' is imported from index.ts
        .post('/api/projects')
        .set('Authorization', 'Bearer fake-token')
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(projectData.name);
      expect(response.body.createdBy).toBe(mockUserId);
      expect(response.body.members).toContain(mockUserId);
      const projectInDb = await Project.findById(response.body._id);
      expect(projectInDb).not.toBeNull();
      // Add a null check for projectInDb before accessing its properties
      if (projectInDb) {
        expect(projectInDb.name).toBe(projectData.name);
        expect(projectInDb.createdBy.toString()).toBe(mockUserId);
        // Add a check for members before mapping
        expect(projectInDb.members).toBeDefined();
        if (projectInDb.members) {
          expect(projectInDb.members.map(m => m.toString())).toContain(mockUserId);
        }
      }
    });

    it('should return 400 if name is missing', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: mockUserId, email: 'test@example.com' });
      const projectData = { description: 'Missing name' }; // createdBy removed
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer fake-token')
        .send(projectData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Project name is required and cannot be empty.');
    });

    it('should return 400 if name is an empty string', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: mockUserId, email: 'test@example.com' });
      const projectData = { name: '   ', description: 'Empty name test' };
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer fake-token')
        .send(projectData);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Project name is required and cannot be empty.');
    });

    it('should return 401 if no token is provided', async () => {
      const projectData = { name: 'Test Project No Auth', description: 'A project for testing' };
      const response = await request(app)
        .post('/api/projects')
        .send(projectData);
      expect(response.status).toBe(401);
    });

    it('should return 403 if token is invalid', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockRejectedValueOnce(new Error('Invalid token'));
      const projectData = { name: 'Test Project Invalid Token', description: 'A project for testing' };
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', 'Bearer fake-token')
        .send(projectData);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/projects', () => {
    it('should return an array of projects for an authenticated user', async () => {
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: mockUserId, email: 'test@example.com' });
      const { Project } = getModels();
      await Project.create([
        { name: 'Project Alpha', createdBy: mockUserId, members: [mockUserId] },
        { name: 'Project Beta', createdBy: anotherMockUserId, members: [anotherMockUserId] }, // Should not be returned if not member
      ]);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer fake-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // This test assumes GET /api/projects returns all projects, not just user's.
      // If it's supposed to return only user's projects, this test needs adjustment
      // and the route implementation needs to filter by req.user.uid.
      // For now, assuming it returns all projects and auth is just a gate.
      expect(response.body.length).toBe(2);
    });

    it('should return 401 if no token is provided', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId', () => {
    it('should return a single project if ID is valid and user is a member', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Gamma', createdBy: mockUserId, members: [mockUserId] });
      const response = await request(app)
        .get(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Project Gamma');
    });

    it('should return 404 if project ID is not found', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/projects/${nonExistentId}`)
        .set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(404);
    });

    it('should return 500 if project ID is invalid', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach
        const invalidId = 'invalid-id-format';
        const response = await request(app)
          .get(`/api/projects/${invalidId}`)
          .set('Authorization', 'Bearer fake-token');
        expect(response.status).toBe(500); // Assuming auth middleware doesn't catch this before Mongoose does
    });

    it('should return 403 if authenticated user is not a project member', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Gamma', createdBy: mockUserId, members: [mockUserId] });
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: anotherMockUserId, email: 'nonmember@example.com' });
      const response = await request(app)
        .get(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this project');
    });
  });

  describe('PUT /api/projects/:projectId', () => {
    it('should update a project and return 200 if user is a member', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach for mockUserId
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Delta', description: 'Original Desc', createdBy: mockUserId, members: [mockUserId] });
      const updates = { name: 'Project Delta Updated', description: 'Updated Desc' };
      const response = await request(app)
        .put(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token') // mockUserId is member
        .send(updates);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
    });

    it('should return 403 if authenticated user is not a project member when updating', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Delta', description: 'Original Desc', createdBy: mockUserId, members: [mockUserId] });
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: anotherMockUserId, email: 'nonmember@example.com' });
      const updates = { name: 'Project Delta Updated Attempt' };
      const response = await request(app)
        .put(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token')
        .send(updates);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this project');
    });

    it('should return 400 if name is an empty string when updating', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Delta', description: 'Original Desc', createdBy: mockUserId, members: [mockUserId] });
      // admin.auth().verifyIdToken is already set in global beforeEach to mockUserId (member)
      const updates = { name: '   ' };
      const response = await request(app)
        .put(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token')
        .send(updates);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Project name cannot be empty.');
    });
  });

  describe('DELETE /api/projects/:projectId', () => {
    it('should delete a project and return 200 if user is a member', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach for mockUserId
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Epsilon', createdBy: mockUserId, members: [mockUserId] });
      const response = await request(app)
        .delete(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token'); // mockUserId is member
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project deleted');
    });

    it('should return 403 if authenticated user is not a project member when deleting', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Project Epsilon', createdBy: mockUserId, members: [mockUserId] });
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: anotherMockUserId, email: 'nonmember@example.com' });
      const response = await request(app)
        .delete(`/api/projects/${(project as any)._id}`)
        .set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this project');
    });
  });

  // --- Project Membership Tests ---
  describe('POST /api/projects/:projectId/members', () => {
    it('should add a member to a project and return 201 if requester is a member', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach for mockUserId
      const { Project } = getModels();
      const project = await Project.create({ name: 'Membership Project', createdBy: mockUserId, members: [mockUserId] }) as IProject;
      const response = await request(app)
        .post(`/api/projects/${(project as any)._id}/members`)
        .set('Authorization', 'Bearer fake-token') // mockUserId is member
        .send({ userId: anotherMockUserId });
      expect(response.status).toBe(201);
      expect(response.body.members.map((m:string) => m.toString())).toContain(anotherMockUserId);
    });

    it('should return 403 if authenticated user is not a project member when adding a member', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Membership Project', createdBy: mockUserId, members: [mockUserId] }) as IProject;
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: anotherMockUserId, email: 'nonmember@example.com' });
      const response = await request(app)
        .post(`/api/projects/${(project as any)._id}/members`)
        .set('Authorization', 'Bearer fake-token')
        .send({ userId: thirdMockUserId });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this project');
    });
  });

  describe('DELETE /api/projects/:projectId/members/:userId', () => {
    it('should remove a member from a project and return 200 if requester is a member', async () => {
      // admin.auth().verifyIdToken is already set in global beforeEach for mockUserId
      const { Project } = getModels();
      const project = await Project.create({ name: 'Remove Member Project', createdBy: mockUserId, members: [mockUserId, anotherMockUserId] });
      const response = await request(app)
        .delete(`/api/projects/${(project as any)._id}/members/${anotherMockUserId}`)
        .set('Authorization', 'Bearer fake-token'); // mockUserId is member
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Member removed');
    });

    it('should return 403 if authenticated user is not a project member when removing a member', async () => {
      const { Project } = getModels();
      const project = await Project.create({ name: 'Remove Member Project', createdBy: mockUserId, members: [mockUserId, thirdMockUserId] });
      (admin.auth().verifyIdToken as jest.Mock).mockResolvedValueOnce({ uid: anotherMockUserId, email: 'nonmember@example.com' });
      const response = await request(app)
        .delete(`/api/projects/${(project as any)._id}/members/${thirdMockUserId}`)
        .set('Authorization', 'Bearer fake-token');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: User is not a member of this project');
    });
  });
});

// --- Project Data Synchronization Tests ---
describe('Project Data Synchronization', () => {
  let createdProject: IProject; // To store project created during tests
  const testUserIdSync = new mongoose.Types.ObjectId().toString(); // Dedicated user ID for these tests
  const agent = request(app); // Supertest agent

  // Helper to set auth token for this specific user
  const setAuthForSyncUser = () => {
    (admin.auth().verifyIdToken as jest.Mock).mockResolvedValue({ uid: testUserIdSync, email: 'syncuser@example.com' });
  };


  beforeAll(async () => {
    // Setup: Ensure a user exists or mock authentication if necessary
    // For these tests, we are focusing on project routes already being authenticated.
    // Initialize test Firestore app if necessary and not done globally
    // e.g. if (admin.apps.length === 0) { admin.initializeApp(...); }
    // For now, assuming firebaseAdmin.ts handles its init.
    // The global beforeAll in this file already handles server and model initialization.
  });

  beforeEach(async () => {
    const { Project } = getModels();
    // Create a project directly in MongoDB for testing deletion and rename
    const projectData = { name: 'Test Sync Project', description: 'Project for sync testing', createdBy: testUserIdSync, members: [testUserIdSync] };
    createdProject = await new Project(projectData).save();

    // Clear mocks before each test
    (firestoreSyncService.handleProjectDeleted as jest.Mock).mockClear();
    (firestoreSyncService.handleProjectRenamed as jest.Mock).mockClear();

    setAuthForSyncUser(); // Set auth for the sync test user

    // TODO: Create mock storyboard data in Firestore linked to createdProject._id
    // This is a placeholder for now. In a full test, you would:
    // const storyboardData = { projectId: createdProject._id.toString(), name: "Test Storyboard", panels: [] };
    // await testFirestoreDb.collection('storyboards').doc('test-storyboard-sync-1').set(storyboardData);
    console.log(`Placeholder: Would create storyboard data in Firestore for project ${createdProject._id.toString()}`);
  });

  afterEach(async () => {
    // Clean up: Remove the project from MongoDB
    const { Project } = getModels();
    if (createdProject && createdProject._id) {
      await Project.findByIdAndDelete(createdProject._id);
    }
    // TODO: Clean up mock storyboard data from Firestore
    // await testFirestoreDb.collection('storyboards').doc('test-storyboard-sync-1').delete();
    console.log(`Placeholder: Would delete storyboard data in Firestore for project ${createdProject._id.toString()}`);
  });

  // Test for Project Deletion
  it('should trigger handleProjectDeleted and remove project from DB when a project is deleted', async () => {
    const response = await agent.delete(`/api/projects/${createdProject.id}`)
      .set('Authorization', 'Bearer fake-token-sync-user'); // Token content doesn't matter due to mock

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Project deleted');

    // Check if project is deleted from MongoDB
    const { Project } = getModels();
    const dbProject = await Project.findById(String(createdProject.id));
    expect(dbProject).toBeNull();

    // Check if firestoreSyncService.handleProjectDeleted was called
    expect(firestoreSyncService.handleProjectDeleted).toHaveBeenCalledWith({
      projectId: String(createdProject.id),
    });
    expect(firestoreSyncService.handleProjectDeleted).toHaveBeenCalledTimes(1);

    // TODO: Add assertions to check Firestore for actual data deletion
    // This would involve querying Firestore.
    // const q = testFirestoreDb.collection('storyboards').where('projectId', '==', createdProject._id.toString());
    // const snapshot = await q.get();
    // expect(snapshot.empty).toBe(true);
    console.log('Placeholder: Would assert Firestore data deletion');
  });

  // Test for Project Rename
  it('should trigger handleProjectRenamed and update project in DB when a project is renamed', async () => {
    const newName = 'Test Sync Project Renamed';
    const response = await agent.put(`/api/projects/${createdProject.id}`)
      .set('Authorization', 'Bearer fake-token-sync-user') // Token content doesn't matter
      .send({ name: newName });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe(newName);

    // Check if project is updated in MongoDB
    const { Project } = getModels();
    const dbProject = await Project.findById(String(createdProject.id));
    expect(dbProject).not.toBeNull();
    expect(dbProject?.name).toBe(newName);

    // Check if firestoreSyncService.handleProjectRenamed was called
    expect(firestoreSyncService.handleProjectRenamed).toHaveBeenCalledWith({
      projectId: String(createdProject.id),
      newName: newName,
    });
    expect(firestoreSyncService.handleProjectRenamed).toHaveBeenCalledTimes(1);

    // TODO: Add assertions to check Firestore for actual data update
    // const doc = await testFirestoreDb.collection('storyboards').doc('test-storyboard-sync-1').get();
    // expect(doc.exists && doc.data()?.projectName).toBe(newName);
    console.log('Placeholder: Would assert Firestore data update');
  });
});
