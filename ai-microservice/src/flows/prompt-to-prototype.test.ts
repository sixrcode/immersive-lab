import { promptToPrototypeFlow, PromptToPrototypeInputSchema } from './prompt-to-prototype';
import { ai } from '../genkit';
import { uploadImageToStorage } from '../storage';
import { v4 as uuidv4 } from 'uuid'; // Import v4 directly

jest.mock('../genkit', () => ({
  ai: {
    definePrompt: jest.fn(), // Will be mocked in beforeEach
    generate: jest.fn(), // To be configured per test
    // Define defineFlow to execute the actual flow function for testing
    // This allows us to test the flow's logic directly
    defineFlow: jest.fn((config, fn) => {
        if (typeof fn !== 'function') {
            throw new Error('Flow function not provided to defineFlow mock');
        }
        return fn; // Return the actual flow function
    }),
  },
}));

jest.mock('../storage', () => ({
  uploadImageToStorage: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-for-image'),
}));

describe('promptToPrototypeFlow - Image Handling', () => {
  // Default input for most tests, customize as needed
  const mockBaseInput: ReturnType<typeof PromptToPrototypeInputSchema.parse> = {
    prompt: 'A futuristic cityscape',
  };

  // Mock text output that the text generation part of the flow would produce
  const mockTextOutputFromAI = {
    loglines: [{ tone: 'dramatic', text: 'In a city of tomorrow...' }],
    moodBoardCells: Array(9).fill(null).map((_, i) => ({ title: `Theme ${i + 1}`, description: `Description for theme ${i + 1}` })),
    shotList: '1,50mm,Pan Right,Wide shot of skyline',
    proxyClipAnimaticDescription: 'A quick fly-through of the city.',
    pitchSummary: 'A stunning vision of the future.',
    // moodBoardImage is handled by image generation, so not included here
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for the text generation prompt (textGenerationPrompt)
    // This mock simulates the behavior of the text generation part of the flow
    (ai.definePrompt as jest.Mock).mockImplementation((promptConfig) => {
      // The function returned by definePrompt is the one called within the flow
      return jest.fn().mockResolvedValue({ output: mockTextOutputFromAI });
    });
  });

  test('1. AI generates data URI, upload to storage succeeds', async () => {
    const testInput = { ...mockBaseInput };
    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'; // Minimal valid base64 PNG
    const fakeGcsUrl = 'https://fake-storage.googleapis.com/moodboard_output_mock-uuid-for-image.png';

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: dataUri },
    });
    (uploadImageToStorage as jest.Mock).mockResolvedValue(fakeGcsUrl);

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe(fakeGcsUrl);
    expect(uploadImageToStorage).toHaveBeenCalledTimes(1);
    expect(uploadImageToStorage).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      mimeType: 'image/png',
      extension: 'png',
      userId: "ai_prototype_system",
      packageId: 'mock-uuid-for-image',
      fileNamePrefix: "moodboard_output_",
    }));
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  test('2. AI generates data URI, upload to storage fails', async () => {
    const testInput = { ...mockBaseInput };
    const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'; // Minimal valid base64 JPEG

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: dataUri },
    });
    (uploadImageToStorage as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe("https://placehold.co/600x400.png?text=Image+Storage+Failed");
    expect(uploadImageToStorage).toHaveBeenCalledTimes(1);
    expect(uploadImageToStorage).toHaveBeenCalledWith(expect.objectContaining({
        mimeType: 'image/jpeg',
        extension: 'jpeg',
    }));
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  test('3. AI image generation fails (returns no URL)', async () => {
    const testInput = { ...mockBaseInput };

    (ai.generate as jest.Mock).mockResolvedValue({
      media: undefined, // Simulate failure like media object being undefined
    });

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe("https://placehold.co/600x400.png?text=Image+Gen+Failed");
    expect(uploadImageToStorage).not.toHaveBeenCalled();
    expect(uuidv4).not.toHaveBeenCalled();
  });

  test('3b. AI image generation fails (media.url is undefined)', async () => {
    const testInput = { ...mockBaseInput };

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: undefined }, // Simulate failure with undefined URL
    });

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe("https://placehold.co/600x400.png?text=Image+Gen+Failed");
    expect(uploadImageToStorage).not.toHaveBeenCalled();
    expect(uuidv4).not.toHaveBeenCalled();
  });


  test('4. AI generates a non-data URI (e.g., already a GCS URL)', async () => {
    const testInput = { ...mockBaseInput };
    const preSignedUrl = 'https://already-a-gcs-url.com/image.png';

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: preSignedUrl },
    });

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe(preSignedUrl);
    expect(uploadImageToStorage).not.toHaveBeenCalled();
    expect(uuidv4).not.toHaveBeenCalled();
  });

  test('5. Input imageDataUri is present, AI generates data URI, upload succeeds', async () => {
    const testInput: ReturnType<typeof PromptToPrototypeInputSchema.parse> = {
      ...mockBaseInput,
      imageDataUri: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=', // User provided image
    };
    const aiGeneratedDataUri = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='; // Minimal webp
    const fakeGcsUrl = 'https://fake-storage.googleapis.com/moodboard_output_mock-uuid-for-image.webp';

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: aiGeneratedDataUri },
    });
    (uploadImageToStorage as jest.Mock).mockResolvedValue(fakeGcsUrl);

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe(fakeGcsUrl);
    expect(uploadImageToStorage).toHaveBeenCalledTimes(1);
    expect(uploadImageToStorage).toHaveBeenCalledWith(expect.objectContaining({
      buffer: expect.any(Buffer),
      mimeType: 'image/webp',
      extension: 'webp',
      packageId: 'mock-uuid-for-image',
    }));
    // Check that the input imageDataUri was passed to ai.generate
    expect(ai.generate).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.arrayContaining([
            expect.objectContaining({ media: { url: testInput.imageDataUri } }),
            expect.objectContaining({ text: expect.any(String) })
        ])
    }));
    expect(uuidv4).toHaveBeenCalledTimes(1);
  });

  test('Should correctly parse various image mime types for data URIs', async () => {
    const testCases = [
      { mime: 'image/png', ext: 'png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAUA' },
      { mime: 'image/jpeg', ext: 'jpeg', data: '/9j/4AAQSkZJRgABAQEASABIAAD' },
      { mime: 'image/gif', ext: 'gif', data: 'R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=' },
      { mime: 'image/webp', ext: 'webp', data: 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==' },
      { mime: 'image/svg+xml', ext: 'svg+xml', data: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==' }, // Basic SVG
    ];

    for (const tc of testCases) {
      const dataUri = `data:${tc.mime};base64,${tc.data}`;
      const fakeGcsUrl = `https://fake-storage.googleapis.com/moodboard_output_mock-uuid-for-image.${tc.ext}`;

      (ai.generate as jest.Mock).mockResolvedValue({ media: { url: dataUri } });
      (uploadImageToStorage as jest.Mock).mockResolvedValue(fakeGcsUrl);
      // Reset uuid mock for each iteration if it's specific to extension, though here it's filename prefix
      (uuidv4 as jest.Mock).mockReturnValue(`mock-uuid-for-image`);


      const result = await promptToPrototypeFlow({ ...mockBaseInput });

      expect(result.moodBoardImage).toBe(fakeGcsUrl);
      expect(uploadImageToStorage).toHaveBeenCalledWith(expect.objectContaining({
        mimeType: tc.mime,
        extension: tc.ext,
      }));
      // Clear mock calls for next iteration, specifically for uploadImageToStorage and uuid
      (uploadImageToStorage as jest.Mock).mockClear();
      (uuidv4 as jest.Mock).mockClear();
    }
  });

  test('Should use placeholder if data URI parsing fails (e.g. malformed URI)', async () => {
    const testInput = { ...mockBaseInput };
    const malformedDataUri = 'data:imagepngbase64,iVBORw0KGgoAAAANSUhEUgAAAAUA'; // Missing slash and semicolon

    (ai.generate as jest.Mock).mockResolvedValue({
      media: { url: malformedDataUri },
    });

    const result = await promptToPrototypeFlow(testInput);

    expect(result.moodBoardImage).toBe("https://placehold.co/600x400.png?text=Image+Parse+Failed");
    expect(uploadImageToStorage).not.toHaveBeenCalled();
    expect(uuidv4).not.toHaveBeenCalled(); // uuid not called as upload is skipped
  });

});
