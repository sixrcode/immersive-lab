import { POST } from '../generate/route'; // Assuming generate.ts exports POST
import { NextRequest } from 'next/server';
 
import { db as mockDb, storage as mockStorage } from '@/lib/firebase/admin';
import { v4 as mockUuidv4, type V4Options } from 'uuid';

// Define types for the mocked Firestore and Storage
type MockFirestore = {
  collection: jest.Mock<any, any, any>; // Updated to jest.Mock<any, any, any> for broader compatibility
  doc: jest.Mock<any, any, any>;
  set: jest.Mock<any, any, any>;
};

jest.mock('@/lib/firebase/admin', () => ({
  db: {
    collection: jest.fn().mockReturnThis(), // Returns the mock itself for chaining
    doc: jest.fn().mockReturnThis(), // Returns the mock itself for chaining
    set: jest.fn().mockResolvedValue(undefined), // Simulates a Firestore set operation
  },
  storage: {
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        getSignedUrl: jest.fn().mockResolvedValue(['mock-default-signed-url']),
      })),
    })),
  },
  // Add mocks for Firestore and Storage types if needed for more specific typing later
  // For now, using any on the mock side is acceptable as we control the mock behavior.
  // The focus here is typing the code that uses the mocks.
  firebaseAdminApp: { // Mock app object as it's checked in POST
    name: 'mockedApp', // or any other properties your code might access
    options: {},
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));
// Mock dataUriToBuffer as it involves Buffer which can be tricky if not perfectly mocked
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual<{ dataUriToBuffer: (dataUri: string) => { buffer: Buffer; mimeType: string; extension: string } | null }>('@/lib/utils'), // Use type assertion for actual
  dataUriToBuffer: jest.fn((dataUri: string): { buffer: Buffer; mimeType: string; extension: string } | null => {
    if (dataUri && dataUri.startsWith('data:')) {

      const parts = dataUri.split(',');
      const header = parts[0];
      const data = parts[1] ?? '';
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType: string = mimeMatch ? mimeMatch[1] : 'image/png'; // Specify type
      let extension = 'png';
      if (mimeType === 'image/jpeg') extension = 'jpg'; // Typo fixed: was 'jpg'
      return {
        buffer: Buffer.from(data, 'base64'),
        mimeType,
        extension,
      };
    }
    return null;
  }),
}));


describe('/api/prototype/generate API Endpoint', () => {
  // Use Partial<NextRequest> or a specific mock request type if neededgit add
  // For now, relying on the createMockRequest return type
  let mockRequest: NextRequest;

  const mockPromptPackageId: string = 'test-prompt-package-id';
  const mockGeneratedImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-moodboard-url';
  const mockUserImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-user-upload-url';

  // Type the mocked db and storage for better type safety in tests
  const typedMockDb = mockDb as unknown as MockFirestore; // Use unknown first for safer casting
  const typedMockStorage = mockStorage as typeof mockStorage;

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    // Type assertion for the mocked fetch function
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          // Default mock response from AI microservice
          loglines: [{ tone: 'Test Tone', text: 'Test logline from mock fetch' }],
          moodBoardCells: Array(9).fill({ title: 'Test Cell', description: 'Test cell description' }),
          moodBoardImage: 'mock-moodboard-image-url-from-fetch',
          shotList: '1,35mm,Test move,Test notes from fetch',
          proxyClipAnimaticDescription: 'Test animatic description from fetch',
          pitchSummary: 'Test pitch summary from fetch',
          originalUserImageURL: undefined, // Default, can be overridden in specific tests
        }), // Type assertion for the AI microservice response
        text: () => Promise.resolve('{}'), // Default text method
      } as Response) // Type assertion for Response
    );

    // Setup default mock implementations for clarity, though they are also set in jest.mock
    (mockUuidv4 as jest.Mock<string, []>).mockReturnValue(mockPromptPackageId);
    (typedMockStorage.bucket().file('').getSignedUrl as jest.Mock).mockResolvedValue([mockGeneratedImageSignedUrl]);
    (typedMockDb.collection('').doc('').set as jest.Mock).mockResolvedValue({});
  });

  async function createMockRequest(
    body: object | null,
    options: { method?: string; url?: string; headers?: Record<string, string> } = {}
  ): Promise<NextRequest> {
    const { method = 'POST', url = '/', headers = {} } = options;
    // Ensure a full URL is provided to the NextRequest constructor
    const fullUrl = url.startsWith('http') ? url : `http://localhost${url.startsWith('/') ? '' : '/'}${url}`;

    return new NextRequest(fullUrl, {
      method: method,
      headers: new Headers(headers),
      body: body ? JSON.stringify(body) : null,
    });
  }


  it('should successfully generate a prototype and save to Firebase', async () => {
    const requestBody = {
      prompt: 'A grand adventure',
      stylePreset: 'cinematic',
      imageDataUri: 'data:image/jpeg;base64,testuserimagedata',
    };
    mockRequest = await createMockRequest(requestBody);

    // Specific mock for user image upload URL
    (typedMockStorage.bucket().file as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('user-upload')) {
            return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockUserImageSignedUrl]) };
        }
        return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockGeneratedImageSignedUrl]) };
    });


    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200);

    expect(typedMockDb.collection).toHaveBeenCalledWith('prompt-packages'); // Collection name from route
    expect(typedMockDb.doc).toHaveBeenCalledWith(mockPromptPackageId);
    expect(typedMockDb.set).toHaveBeenCalledWith(expect.objectContaining({
      id: mockPromptPackageId,
      userId: 'anonymous_user', // From route
      prompt: requestBody.prompt,
      originalImageURL: 'mock-user-upload-url', // This needs to come from fetch mock if image was sent
      moodBoard: expect.objectContaining({
        generatedImageURL: 'mock-moodboard-image-url-from-fetch',
      }),
    }));

    expect(responseJson).toEqual(expect.objectContaining({
      id: mockPromptPackageId,
      originalImageURL: 'mock-user-upload-url', // This needs to come from fetch mock
      moodBoard: expect.objectContaining({
        generatedImageURL: 'mock-moodboard-image-url-from-fetch',
      }),
    }));
  });

  it('should return 400 for invalid input (missing prompt)', async () => {
    const requestBody = { stylePreset: 'anime' }; // Missing prompt
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(400);
    expect(responseJson.error).toBe('Invalid input');
    expect(responseJson.details).toBeDefined(); // Zod errors
  });

  it('should return 503 if AI microservice fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    const requestBody = { prompt: 'A risky prompt' };
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(503); // Changed from 500 to 503 as per route logic
    expect(responseJson.error).toContain('Failed to contact prompt generation service.');
    expect(responseJson.details).toBe('Network error');
  });

  it('should return 500 if Firestore save fails', async () => {
    (typedMockDb.collection('prompt-packages').doc(mockPromptPackageId).set as jest.Mock).mockRejectedValue(new Error('Firestore unavailable'));
    const requestBody = { prompt: 'Save this if you can' };
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson.error).toBe('Failed to save data to database.');
    expect(responseJson.details).toBe('Firestore unavailable');
  });



  // Test case for when no imageDataUri is provided
  it('should run successfully without an imageDataUri', async () => {
    const requestBody = {
      prompt: 'A prompt without an image',
      stylePreset: 'documentary',
    };
    mockRequest = await createMockRequest(requestBody);

    // Configure fetch mock for this specific test if needed, e.g., to ensure originalUserImageURL is undefined
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          loglines: [{ tone: 'Test Tone', text: 'Test logline' }],
          moodBoardCells: Array(9).fill({ title: 'Test Cell', description: 'Test cell description' }),
          moodBoardImage: 'mock-moodboard-image-url',
          shotList: '1,35mm,Test move,Test notes',
          proxyClipAnimaticDescription: 'Test animatic description',
          pitchSummary: 'Test pitch summary',
          originalUserImageURL: undefined, // Explicitly undefined
        }),
      } as Response)
    );

    // Call the POST function with the mock request
    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/generate'), // microservice URL check
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(requestBody), // Check body sent to microservice
      })
    );

    expect(typedMockDb.set).toHaveBeenCalledWith(expect.objectContaining({
      id: mockPromptPackageId,
      prompt: requestBody.prompt,
      originalImageURL: undefined, // Should be undefined as no image was sent
      moodBoard: expect.objectContaining({
        generatedImageURL: 'mock-moodboard-image-url', // from fetch mock
      }),
    }));
    expect(responseJson.originalImageURL).toBeUndefined();
  });

});
