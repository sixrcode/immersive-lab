import { POST } from '../generate/route'; // Assuming generate.ts exports POST
import { NextRequest } from 'next/server';
import { createMocks, RequestMethod } from 'node-mocks-http'; // Add this import at the top

import { promptToPrototype as mockPromptToPrototype } from '@/ai/flows/prompt-to-prototype';
import { db as mockDb, storage as mockStorage } from '@/lib/firebase/admin';
import { v4 as mockUuidv4 } from 'uuid';

// --- Mocks ---
jest.mock('@/ai/flows/prompt-to-prototype', () => ({
  ...jest.requireActual('@/ai/flows/prompt-to-prototype'), // Import and retain default exports
  promptToPrototype: jest.fn(),
  PromptToPrototypeInputSchema: jest.requireActual('@/ai/flows/prompt-to-prototype').PromptToPrototypeInputSchema, // Use actual schema
}));

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

    // Setup default mock implementations for clarity, though they are also set in jest.mock
    (mockUuidv4 as jest.Mock).mockReturnValue(mockPromptPackageId);
    (mockPromptToPrototype as jest.Mock).mockResolvedValue({
      // Mock the expected output structure of the flow
      loglines: [{ tone: 'Test Tone', text: 'Test logline' }],
      moodBoardImage: 'data:image/png;base64,testmoodboardimagedata',
      moodBoardCells: Array(9).fill({ title: 'Test Cell', description: 'Test cell description' }),
      shotList: '1,35mm,Test move,Test notes', // Assuming shotList is initially a string before parsing
      proxyClipAnimaticDescription: 'Test animatic description',
      pitchSummary: 'Test pitch summary',
    });
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
 headers: req.headers as Headers,
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
    expect(mockPromptToPrototype).toHaveBeenCalledWith(requestBody);

    // Check user image upload
    expect(mockStorage.bucket).toHaveBeenCalledTimes(2); // Once for user, once for AI
    expect(mockStorage.bucket().file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/user-upload`));
    expect(mockStorage.bucket().file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/moodboard`));

    expect(mockDb.collection).toHaveBeenCalledWith('promptPackages');
    expect(mockDb.doc).toHaveBeenCalledWith(mockPromptPackageId);
    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
      id: mockPromptPackageId,
      userId: mockUserId, // Placeholder in actual code
      prompt: requestBody.prompt,
      originalImageURL: mockUserImageSignedUrl,
      moodBoard: expect.objectContaining({
        generatedImageURL: mockGeneratedImageSignedUrl,
      }),
    }));

    expect(responseJson).toEqual(expect.objectContaining({
      id: mockPromptPackageId,
      originalImageURL: mockUserImageSignedUrl,
      moodBoard: expect.objectContaining({
        generatedImageURL: mockGeneratedImageSignedUrl,
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
    expect(mockPromptToPrototype).not.toHaveBeenCalled();
  });

  it('should return 500 if AI flow fails', async () => {
    (mockPromptToPrototype as jest.Mock).mockRejectedValue(new Error('AI flow crashed'));
    const requestBody = { prompt: 'A risky prompt' };
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson.error).toContain('AI flow processing error');
    expect(responseJson.details).toBe('AI flow crashed');
  });

  it('should return 500 if Firestore save fails', async () => {
    (mockDb.collection('').doc('').set as jest.Mock).mockRejectedValue(new Error('Firestore unavailable'));
    const requestBody = { prompt: 'Save this if you can' };
    mockRequest = await createMockRequest(requestBody);

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson.error).toBe('Failed to save data to database.');
    expect(responseJson.details).toBe('Firestore unavailable');
  });

  it('should handle user image upload failure gracefully', async () => {
    const requestBody = {
      prompt: 'A grand adventure with a problematic image',
      imageDataUri: 'data:image/jpeg;base64,testuserimagedata_problematic',
    };
    mockRequest = await createMockRequest(requestBody);

    (mockStorage.bucket().file as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('user-upload')) {
            // Simulate failure for user image upload
            return { save: jest.fn().mockRejectedValue(new Error('User upload failed')), getSignedUrl: jest.fn() };
        }
        // AI moodboard image uploads fine
        return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockGeneratedImageSignedUrl]) };
    });

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200); // Still 200, but originalImageURL should be undefined
    expect(responseJson.originalImageURL).toBeUndefined();
    expect(responseJson.moodBoard.generatedImageURL).toBe(mockGeneratedImageSignedUrl); // AI image is fine
    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
      originalImageURL: undefined, // Check it's saved as undefined
    }));
  });

  it('should handle AI moodboard image upload failure gracefully', async () => {
    const requestBody = { prompt: 'A grand adventure, AI image fails' };
    mockRequest = await createMockRequest(requestBody);

    // Simulate failure for AI moodboard image upload
     (mockStorage.bucket().file as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('moodboard')) {
            return { save: jest.fn().mockRejectedValue(new Error('AI image upload failed')), getSignedUrl: jest.fn() };
        }
        // User image (if any) would be fine, or not present.
        return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockUserImageSignedUrl]) };
    });


    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson.moodBoard.generatedImageURL).toBe('https://placehold.co/600x400.png?text=Moodboard+Failed'); // Fallback URL
    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
      moodBoard: expect.objectContaining({
        generatedImageURL: 'https://placehold.co/600x400.png?text=Moodboard+Failed',
      }),
    }));
  });

  // Test case for when no imageDataUri is provided
  it('should run successfully without an imageDataUri', async () => {
    const requestBody = {
      prompt: 'A prompt without an image',
      stylePreset: 'documentary',
    };
    mockRequest = await createMockRequest(requestBody);

    // Ensure user image upload path is not called by only mocking the moodboard path for storage.file
    (mockStorage.bucket().file as jest.Mock).mockImplementation((path: string) => {
        if (path.includes('moodboard')) {
             return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue([mockGeneratedImageSignedUrl]) };
        }
        // This should ideally not be hit if imageDataUri is not provided.
        // If it is, the test for specific user-upload path will fail, which is good.
        return { save: jest.fn().mockResolvedValue(undefined), getSignedUrl: jest.fn().mockResolvedValue(['some_other_url']) };
    });

    const response = await POST(mockRequest);
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(mockPromptToPrototype).toHaveBeenCalledWith(requestBody);

    // Check that user image upload was NOT attempted for storage.file('prototypes/userId/promptPackageId/user-upload-...')
    // We check that only the moodboard path was called for storage.file
    const fileCalls = (mockStorage.bucket().file as jest.Mock).mock.calls;
    expect(fileCalls.some(call => call[0].includes('user-upload'))).toBe(false);
    expect(fileCalls.some(call => call[0].includes('moodboard'))).toBe(true);


    expect((mockDb as any).set).toHaveBeenCalledWith(expect.objectContaining({
      id: mockPromptPackageId,
      prompt: requestBody.prompt,
      originalImageURL: undefined, // Should be undefined as no image was sent
      moodBoard: expect.objectContaining({
        generatedImageURL: mockGeneratedImageSignedUrl,
      }),
    }));
    expect(responseJson.originalImageURL).toBeUndefined();
  });

});
