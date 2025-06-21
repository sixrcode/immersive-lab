// src/app/api/projects/[projectId]/storyboards/route.test.ts

jest.useRealTimers();
import { NextResponse } from 'next/server';
import { GET } from '../route'; // Assuming GET is exported from the route file

// --- Mocks Start ---

// Mock next/server's NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((body, init) => ({
        json: () => Promise.resolve(body), // Simplified mock response object
        status: init?.status || 200,
        headers: new Headers(init?.headers) // Removed trailing comma

      })) // Removed trailing comma here
    }
  };
});

// Define the actual Jest mock functions that tests will interact with for Firebase
const mockVerifyIdToken = jest.fn();
const mockResolvedValueForGet = { // Defined object separately
  empty: true,
  docs: [],
};
const mockGet = jest.fn().mockResolvedValue(mockResolvedValueForGet); // Default mock for get
const mockWhere = jest.fn();
const mockCollection = jest.fn();
const mockGet = jest.fn(); // Declare mockGet here
const mockVerifyIdToken = jest.fn(); // Declare mockVerifyIdToken here

jest.mock('@/lib/firebase/admin', () => {
  // Define the mocks that will be used by the factory here, or ensure they are in scope.
  // For functions that need to be spied on AND used by the mock factory,
  // they must be defined in a way that the factory can access their mocked implementations.

  // Re-initialize mocks for clarity within the factory's scope if needed,
  // or ensure outer scope mocks are correctly configured.
  // Here, we'll use the outer scope mocks that we'll define/clear in beforeEach.

  // This structure ensures that the functions returned by the mock factory
  // are indeed the jest.fn() instances we can control in tests.
  mockGet.mockResolvedValue({ empty: true, docs: [] }); // Default behavior
  mockWhere.mockReturnValue({ get: mockGet });
  mockCollection.mockReturnValue({ where: mockWhere });
  mockVerifyIdToken.mockResolvedValue({ uid: 'test-user-id' }); // Default behavior

  return {
    firebaseAdminApp: {
      name: 'mockedApp',
      options: {},
      auth: () => ({
        verifyIdToken: mockVerifyIdToken,
      })
    },
    db: {
      collection: mockCollection
    }
  };
});

// --- Mocks End ---

// These are the mock functions tests will interact with.
// They are already declared above and configured within jest.mock factory.
// const mockVerifyIdToken = jest.fn(); // Already declared
// const mockResolvedValueForGet = { empty: true, docs: [] }; // Not needed if mockGet configured directly
// const mockGet = jest.fn().mockResolvedValue(mockResolvedValueForGet); // Already declared & configured
// const mockWhere = jest.fn(() => ({ get: mockGet })); // Already declared & configured
// const mockCollection = jest.fn((collectionPath: string) => ({ where: mockWhere })); // Already declared & configured
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

// Define a type for the mock document data
interface MockStoryboardData {
  id: string;
  name: string; // Assuming name is a string
  projectId: string; // Assuming projectId is a string
  frames: any[]; // TODO: Replace 'any' with a more specific type for frames if possible
}

describe('API Route: /api/projects/[projectId]/storyboards', () => {
  const mockProjectId = 'test-project-id';
  const mockUserId = 'test-user-id';
  beforeEach(() => {
 jest.clearAllMocks(); // Clears all mocks before each test
 mockVerifyIdToken.mockResolvedValue({ uid: mockUserId }); // Default mock for auth
 mockCollection.mockClear();
 mockWhere.mockClear();
 mockGet.mockClear();
    (NextResponse.json as jest.Mock).mockClear();
  });

  describe('GET /api/projects/[projectId]/storyboards', () => { // Explicitly type mockStoryboardsData
    it('should return 200 and storyboards if found', async () => { // Explicitly type mockStoryboardsData
      const mockStoryboardsData: MockStoryboardData[] = [
        { id: 'storyboard1', name: 'Storyboard 1', projectId: mockProjectId, frames: [] },
        { id: 'storyboard2', name: 'Storyboard 2', projectId: mockProjectId, frames: [] },
      ];
      mockGet.mockResolvedValueOnce({
 empty: false,
 docs: mockStoryboardsData.map(s => ({ id: s.id, data: () => s })), // Map data to simulate DocumentSnapshot
 });

      const req = createMockRequest('Bearer valid-token');
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
      const body = await response.json();
 // Adjusted the expected value to match the mocked response structure
      expect(response.status).toBe(200); // Check status code
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

      expect(response.status).toBe(200); // Check status code
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

      expect(response.status).toBe(500); // Check status code
      expect(body.error).toBe('Failed to fetch storyboards.');
      expect(body.details).toBe('Firestore error');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Failed to fetch storyboards.', details: 'Firestore error' },
        { status: 500 }
      );
      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    });

 it('should return 401 if Authorization header is missing', async () => { // Removed .only
      const req = createMockRequest(null); // Pass null for missing Authorization header
      const response = await GET(req as any, { params: { projectId: mockProjectId } });
 const body = await response.json(); // Adjusted the expected value to match the mocked response structure
      expect(response.status).toBe(401); // Check status code
 // Adjusted the expected value to match the mocked response structure
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
 const body = await response.json(); // Adjusted the expected value to match the mocked response structure
      expect(response.status).toBe(401); // Check status code
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
 const body = await response.json(); // Adjusted the expected value to match the mocked response structure
      expect(response.status).toBe(403); // Check status code
      expect(body.error).toBe('Unauthorized. Invalid ID token.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Unauthorized. Invalid ID token.' },
        { status: 403 }
      );
      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should return 400 if projectId is missing or invalid', async () => {
      const reqForEmpty = createMockRequest('Bearer valid-token') as any;
      let response = await GET(reqForEmpty, { params: { projectId: '' } });
      let body = await response.json(); // Get response body

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid or missing projectId.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or missing projectId.' },
        { status: 400 }
      );

      const reqForSpaces = createMockRequest('Bearer valid-token') as any;
      response = await GET(reqForSpaces as any, { params: { projectId: '   ' } });
      body = await response.json(); // Get response body after the second call
 // Adjusted the expected value to match the mocked response structure
      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid or missing projectId.');
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invalid or missing projectId.' },
        { status: 400 }
      );
    });

    it('should return 500 if Firebase Admin SDK is not initialized', async () => {
        jest.resetModules(); // Reset module registry to ensure a fresh import

        jest.doMock('next/server', () => {
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
 firebaseAdminApp: null, // Simulate uninitialized SDK by setting to null
 auth: null, // Also set auth to null for uninitialized state
 db: { collection: (...args: [string]) => mockCollection(...args) } // Type args // Corrected typo here
        }));
        // Import the route after mocking
        const { GET: GET_LOCAL } = await import('../route');
 // Simplified mock request creator for local test
        const localCreateMockRequest = (token: string | null) => ({
          headers: { get: jest.fn().mockReturnValue(token) }
        });

        const req = localCreateMockRequest('Bearer valid-token');
        const response = await GET_LOCAL(req as any, { params: { projectId: mockProjectId } });
 const body = await response.json(); // Consume the response body

 expect(response.status).toBe(500); // Check status code
        expect(body.error).toBe('Firebase Admin SDK not initialized.');

        const MockedNextResponse = (await import('next/server')).NextResponse; // Use import instead of require
        expect(MockedNextResponse.json).toHaveBeenCalledWith( 
            { error: 'Firebase Admin SDK not initialized.' }, { status: 500 }
        );
        jest.unmock('@/lib/firebase/admin');
        jest.unmock('next/server');
    });
  });
});
