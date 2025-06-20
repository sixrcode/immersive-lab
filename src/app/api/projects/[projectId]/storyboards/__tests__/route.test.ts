// src/app/api/projects/[projectId]/storyboards/route.test.ts

import { GET } from '../route'; // Adjust path as necessary
import { NextRequest, NextResponse } from 'next/server'; // Import NextResponse for mocking

// --- Mocks Start ---

// Mock next/server's NextResponse
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: jest.fn((body, init) => {
        // This is a simplified mock. A real Response object has more methods/properties.
        return {
          json: () => Promise.resolve(body), // Simulates response.json()
          status: init?.status || 200,     // Simulates response.status
          headers: new Headers(init?.headers), // Simulates response.headers
          // Add other properties/methods if your code under test uses them
        };
      }),
    },
  };
});

// Define the actual Jest mock functions that tests will interact with for Firebase
const mockVerifyIdToken = jest.fn();
const mockCollection = jest.fn().mockReturnThis();
const mockWhere = jest.fn().mockReturnThis();
const mockGet = jest.fn();

jest.mock('@/lib/firebase/admin', () => {
  return {
    firebaseAdminApp: {
      name: 'mockedApp',
      options: {},
      getOrInitService: jest.fn((serviceName: string) => {
        if (serviceName === 'auth') {
          return { verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args) };
        }
        if (serviceName === 'firestore') {
          return { getDatabase: () => ({ collection: (...args: any[]) => mockCollection(...args) }) };
        }
        return null;
      }),
    },
    auth: { verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args) },
    db: { collection: (...args: any[]) => mockCollection(...args) }
  };
});

// --- Mocks End ---

// Minimal mock for NextRequest based on usage in the GET handler
type MockRequest = {
  headers: {
    get: jest.Mock<string | null, [string]>;
  };
};

function createMockRequest(authorizationHeaderValue: string | null): MockRequest {
  return {
    headers: {
      get: jest.fn().mockImplementation((headerName: string) => {
        if (headerName === 'Authorization') {
          return authorizationHeaderValue;
        }
        return null;
      }),
    },
  };
}

describe('API Route: /api/projects/[projectId]/storyboards', () => {
  const mockProjectId = 'test-project-id';
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: mockUserId });
    mockCollection.mockReturnValue({ where: mockWhere } as any);
    mockWhere.mockReturnValue({ get: mockGet } as any);
    mockGet.mockResolvedValue({
        empty: true,
        docs: [],
        forEach: jest.fn()
      });
    // Also clear the NextResponse.json mock calls if needed, though usually jest.clearAllMocks() handles jest.fn() inside jest.mock
    (NextResponse.json as jest.Mock).mockClear();
  });

  describe('GET /api/projects/[projectId]/storyboards', () => {
    it('should return 200 and storyboards if found', async () => {
      const mockStoryboardsData = [
        { id: 'storyboard1', name: 'Storyboard 1', projectId: mockProjectId, frames: [] },
        { id: 'storyboard2', name: 'Storyboard 2', projectId: mockProjectId, frames: [] },
      ];
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: mockStoryboardsData.map(s => ({ data: () => s })),
        forEach: (callback: (doc: any) => void) => mockStoryboardsData.map(s => ({ data: () => s })).forEach(callback)
      });

      const req = createMockRequest('Bearer valid-token');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json(); // This will now use our mocked NextResponse.json's behavior

      expect(response.status).toBe(200);
      expect(body).toEqual(mockStoryboardsData);
      expect(NextResponse.json).toHaveBeenCalledWith(mockStoryboardsData, { status: 200 });
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockCollection).toHaveBeenCalledWith('storyboards');
      expect(mockWhere).toHaveBeenCalledWith('projectId', '==', mockProjectId);
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 200 and an empty array if no storyboards are found', async () => {
      const req = createMockRequest('Bearer valid-token');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual([]);
      expect(NextResponse.json).toHaveBeenCalledWith([], { status: 200 });
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return 500 if Firestore throws an error', async () => {
      const firestoreError = new Error('Firestore error');
      mockGet.mockRejectedValue(firestoreError);

      const req = createMockRequest('Bearer valid-token');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to fetch storyboards.');
      expect(body.details).toBe('Firestore error');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch storyboards.', details: 'Firestore error' },
        { status: 500 }
      );
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return 401 if Authorization header is missing', async () => {
      const req = createMockRequest(null);
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized. No Bearer token provided.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized. No Bearer token provided.' },
        { status: 401 }
      );
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return 401 if Bearer token is empty', async () => {
      const req = createMockRequest('Bearer ');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.error).toBe('Unauthorized. Bearer token is empty.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized. Bearer token is empty.' },
        { status: 401 }
      );
      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return 403 if ID token verification fails', async () => {
      const authError = new Error('Invalid token');
      mockVerifyIdToken.mockRejectedValue(authError);

      const req = createMockRequest('Bearer invalid-token');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.error).toBe('Unauthorized. Invalid ID token.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized. Invalid ID token.' },
        { status: 403 }
      );
      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should return 400 if projectId is missing or invalid', async () => {
      const reqForEmpty = createMockRequest('Bearer valid-token');
      let response = await GET(reqForEmpty as any, { params: { projectId: '' } });
      let body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid or missing projectId.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or missing projectId.' },
        { status: 400 }
      );

      const reqForSpaces = createMockRequest('Bearer valid-token');
      response = await GET(reqForSpaces as any, { params: { projectId: '   ' } });
      body = await response.json();
      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid or missing projectId.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or missing projectId.' },
        { status: 400 }
      );
    });

    it('should return 500 if Firebase Admin SDK is not initialized', async () => {
        jest.resetModules();
        // Redo mocks for this specific test scope where firebaseAdminApp is null
        const localMockVerifyIdToken = jest.fn();
        const localMockCollection = jest.fn().mockReturnThis();
        // No need for localMockWhere/Get as collection won't be called if SDK check fails first

        jest.doMock('next/server', () => { // Also re-mock NextResponse for this scope
          const originalModule = jest.requireActual('next/server');
          return {
            ...originalModule,
            NextResponse: {
              ...originalModule.NextResponse,
              json: jest.fn((body, init) => ({
                json: () => Promise.resolve(body),
                status: init?.status || 200,
                headers: new Headers(init?.headers),
              })),
            },
          };
        });

        jest.doMock('@/lib/firebase/admin', () => ({
          firebaseAdminApp: null,
          auth: { verifyIdToken: (...args: any[]) => localMockVerifyIdToken(...args) },
          db: { collection: (...args: any[]) => localMockCollection(...args) }
        }));

        const { GET: GET_LOCAL } = await import('../route');
        const localCreateMockRequest = (token: string | null) => ({ // Local minimal req mock
          headers: { get: jest.fn().mockReturnValue(token) }
        });

        const req = localCreateMockRequest('Bearer valid-token');
        const response = await GET_LOCAL(req as any, { params: { projectId: mockProjectId } });
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error).toBe('Firebase Admin SDK not initialized.');
        // Check that the mocked NextResponse.json specific to this test was called
        const MockedNextResponse = require('next/server').NextResponse; // Get the mocked version
        expect(MockedNextResponse.json).toHaveBeenCalledWith(
            { error: 'Firebase Admin SDK not initialized.' }, { status: 500 }
        );
        jest.unmock('@/lib/firebase/admin');
        jest.unmock('next/server');
    });
  });
});
