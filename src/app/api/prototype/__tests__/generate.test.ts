import { POST } from '../generate/route'; // Assuming generate.ts exports POST
import { NextRequest } from 'next/server';
import { createMocks, RequestMethod } from 'node-mocks-http'; // Add this import at the top

// import { promptToPrototype as mockPromptToPrototype } from '@/ai/flows/prompt-to-prototype';
import { db as mockDb, storage as mockStorage } from '@/lib/firebase/admin';
import { v4 as mockUuidv4 } from 'uuid';

// --- Mocks ---
// jest.mock('@/ai/flows/prompt-to-prototype', () => ({
//   ...jest.requireActual('@/ai/flows/prompt-to-prototype'), // Import and retain default exports
//   promptToPrototype: jest.fn(),
//   PromptToPrototypeInputSchema: jest.requireActual('@/ai/flows/prompt-to-prototype').PromptToPrototypeInputSchema, // Use actual schema
// }));

jest.mock('@/lib/firebase/admin', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    set: jest.fn().mockResolvedValue(undefined), // Default mock for set
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
  let mockRequest: NextRequest;


  const mockUserId = 'test-user-id';
  const mockPromptPackageId = 'test-prompt-package-id';
  const mockGeneratedImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-moodboard-url';
  const mockUserImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-user-upload-url';

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

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
        }),
        text: () => Promise.resolve('{}'), // Default text method
      } as Response) // Type assertion for Response
    );

    // Setup default mock implementations for clarity, though they are also set in jest.mock
    (mockUuidv4 as jest.Mock).mockReturnValue(mockPromptPackageId);
    // (mockPromptToPrototype as jest.Mock).mockResolvedValue({
    //   // Mock the expected output structure of the flow
    //   loglines: [{ tone: 'Test Tone', text: 'Test logline' }],
    //   moodBoardImage: 'data:image/png;base64,testmoodboardimagedata',
    //   moodBoardCells: Array(9).fill({ title: 'Test Cell', description: 'Test cell description' }),
    //   shotList: '1,35mm,Test move,Test notes', // Assuming shotList is initially a string before parsing
    //   proxyClipAnimaticDescription: 'Test animatic description',
    //   pitchSummary: 'Test pitch summary',
    // });
    (mockStorage.bucket().file('').getSignedUrl as jest.Mock).mockResolvedValue([mockGeneratedImageSignedUrl]);
    (mockDb.collection('').doc('').set as jest.Mock).mockResolvedValue({});
  });

  async function createMockRequest(body: object | null, method: string = 'POST'): Promise<NextRequest> {
    const { req } = createMocks({ method: method as RequestMethod });
    // NextRequest needs a URL, even if it's a dummy one for API routes
    // The as unknown as NextRequest is necessary because node-mocks-http doesn't fully replicate NextRequest
    // Ensure body is passed correctly for NextRequest, typically stringified JSON
    return new NextRequest(new URL(req.url || '/', 'http://localhost').toString(), {
        // Pass the body as a string or ReadableStream if simulating real request more closely
        method: req.method as any, // Cast to any to satisfy NextRequest type
 headers: new Headers(req.headers as Record<string, string>),
        body: body ? JSON.stringify(body) : null, //node-mocks-http doesn't stringify
    }) as unknown as NextRequest;
}


  it('should successfully generate a prototype and save to Firebase', async () => {
    const requestBody = {
      prompt: 'A grand adventure',
      stylePreset: 'cinematic',
      imageDataUri: 'data:image/jpeg;base64,testuserimagedata',
    };
    mockRequest = await createMockRequest(requestBody);

    // Specific mock for user image upload URL
    (mockStorage.bucket().file as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('user-upload')) {
            return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockUserImageSignedUrl]) };
        }
        return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockGeneratedImageSignedUrl]) };
    });


    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    // expect(mockPromptToPrototype).toHaveBeenCalledWith(requestBody);

    // Check user image upload
    // With fetch mock, direct image upload to GCS is not happening in this test's scope for user image.
    // The microservice is assumed to handle it and return a URL.
    // So, these specific GCS mocks for user image might not be directly relevant unless testing that part specifically.
    // For now, let's assume the microservice returns originalUserImageURL if an image was part of input.
    // expect(mockStorage.bucket).toHaveBeenCalledTimes(2); // Once for user, once for AI
    // expect(mockStorage.bucket().file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/user-upload`));
    // expect(mockStorage.bucket().file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/moodboard`));

    expect(mockDb.collection).toHaveBeenCalledWith('prompt-packages'); // Collection name from route
    expect(mockDb.doc).toHaveBeenCalledWith(mockPromptPackageId);
    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
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
    // expect(mockPromptToPrototype).not.toHaveBeenCalled();
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
    (mockDb.collection('prompt-packages').doc(mockPromptPackageId).set as jest.Mock).mockRejectedValue(new Error('Firestore unavailable'));
    const requestBody = { prompt: 'Save this if you can' };
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson.error).toBe('Failed to save data to database.');
    expect(responseJson.details).toBe('Firestore unavailable');
  });

  // This test might need to be re-evaluated as image uploading is now part of the microservice.
  // The API route itself doesn't handle file operations with GCS directly anymore.
  // It just passes imageDataUri to the microservice.
  // it('should handle user image upload failure gracefully', async () => { ... });

  // This test also needs re-evaluation for similar reasons.
  // The fallback URL logic was in the old promptToPrototype flow.
  // If the microservice fails to produce an image, it should handle that,
  // or this API should handle the microservice's error response for that case.
  // it('should handle AI moodboard image upload failure gracefully', async () => { ... });


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

    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
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
