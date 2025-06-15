import { POST } from '../generate'; // Assuming generate.ts exports POST
import { NextRequest } from 'next/server';
import { createMocks, Mocks } from 'node-mocks-http';
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
    set: jest.fn(),
  },
  storage: {
    bucket: jest.fn().mockReturnThis(),
    file: jest.fn().mockReturnThis(),
    save: jest.fn(),
    getSignedUrl: jest.fn(),
  },
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
  ...jest.requireActual('@/lib/utils'),
  dataUriToBuffer: jest.fn((dataUri: string) => {
    if (dataUri && dataUri.startsWith('data:')) {
      const parts = dataUri.split(',');
      const header = parts[0];
      const data = parts[1] || '';
      const mimeMatch = header.match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      let extension = 'png';
      if (mimeType === 'image/jpeg') extension = 'jpg';
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
  let mockRequest: Mocks<NextRequest, any>['req'];
  // We don't typically use res from node-mocks-http with NextRequest/NextResponse
  // const { req, res } = createMocks({ method: 'POST', body: {} });
  // mockRequest = req as unknown as NextRequest; // Cast for type compatibility

  const mockUserId = 'test-user-id';
  const mockPromptPackageId = 'test-prompt-package-id';
  const mockGeneratedImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-moodboard-url';
  const mockUserImageSignedUrl = 'https://firebasestorage.googleapis.com/mock-user-upload-url';

  beforeEach(() => {
    jest.clearAllMocks(); // Clear mocks before each test

    // Setup default mock implementations
    (mockUuidv4 as jest.Mock).mockReturnValue(mockPromptPackageId);
    (mockPromptToPrototype as jest.Mock).mockResolvedValue({
      loglines: [{ tone: 'Test Tone', text: 'Test logline' }],
      moodBoardImage: 'data:image/png;base64,testmoodboardimagedata',
      moodBoardCells: Array(9).fill({ title: 'Test Cell', description: 'Test cell description' }),
      shotList: '1,35mm,Test move,Test notes',
      proxyClipAnimaticDescription: 'Test animatic description',
      pitchSummary: 'Test pitch summary',
    });
    (mockStorage.file('').getSignedUrl as jest.Mock).mockResolvedValue([mockGeneratedImageSignedUrl]);
    (mockDb.collection('').doc('').set as jest.Mock).mockResolvedValue({});
  });

  async function createMockRequest(body: any, method: string = 'POST'): Promise<NextRequest> {
    const { req } = createMocks({ method, body });
    // NextRequest needs a URL, even if it's a dummy one for API routes
    return new NextRequest(new URL(req.url || '/', 'http://localhost'), {
        method: req.method,
        headers: req.headers,
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
    (mockStorage.file as jest.Mock).mockImplementation((path: string) => {
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
    expect(mockStorage.file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/user-upload`));
    expect(mockStorage.file).toHaveBeenCalledWith(expect.stringContaining(`prototypes/${mockUserId}/${mockPromptPackageId}/moodboard`));

    expect(mockDb.collection).toHaveBeenCalledWith('promptPackages');
    expect(mockDb.doc).toHaveBeenCalledWith(mockPromptPackageId);
    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
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

    (mockStorage.file as jest.Mock).mockImplementation((path: string) => {
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
    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
      originalImageURL: undefined, // Check it's saved as undefined
    }));
  });

  it('should handle AI moodboard image upload failure gracefully', async () => {
    const requestBody = { prompt: 'A grand adventure, AI image fails' };
    mockRequest = await createMockRequest(requestBody);

    // Simulate failure for AI moodboard image upload
     (mockStorage.file as jest.Mock).mockImplementation((path: string) => {
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
    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
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
    (mockStorage.file as jest.Mock).mockImplementation((path: string) => {
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
    const fileCalls = (mockStorage.file as jest.Mock).mock.calls;
    expect(fileCalls.some(call => call[0].includes('user-upload'))).toBe(false);
    expect(fileCalls.some(call => call[0].includes('moodboard'))).toBe(true);


    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
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
