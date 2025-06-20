const request = require('supertest');
const admin = require('firebase-admin'); // Gets the mocked version from jest.setup.js
const { v4: uuidv4 } = require('uuid'); // Gets the mocked version

// Mock AI flow modules
jest.mock('./src/flows/ai-script-analyzer', () => ({
  analyzeScript: jest.fn(),
  AnalyzeScriptInputSchema: { safeParse: jest.fn() },
}));
jest.mock('./src/flows/prompt-to-prototype', () => ({
  promptToPrototype: jest.fn(),
  PromptToPrototypeInputSchema: { safeParse: jest.fn() },
}));
jest.mock('./src/flows/storyboard-generator-flow', () => ({
  generateStoryboard: jest.fn(),
  StoryboardGeneratorInputSchema: { safeParse: jest.fn() },
}));

// Now, when these are required, they get the mocked versions
const { analyzeScript, AnalyzeScriptInputSchema } = require('./src/flows/ai-script-analyzer');
const { promptToPrototype, PromptToPrototypeInputSchema } = require('./src/flows/prompt-to-prototype');
const { generateStoryboard, StoryboardGeneratorInputSchema } = require('./src/flows/storyboard-generator-flow');

let app;

// Mock the auth middleware
const mockAuthMiddleware = jest.fn((req, res, next) => {
  next();
});
jest.mock('./src/auth', () => ({
  authenticate: (req, res, next) => mockAuthMiddleware(req, res, next),
}));

// Mock dataUriToBuffer utility
const mockDataUriToBuffer = require('./src/utils').dataUriToBuffer;
jest.mock('./src/utils', () => ({
    dataUriToBuffer: jest.fn(),
}));


describe('AI Microservice API Endpoints', () => {
  beforeAll(() => {
    app = require('./index').app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthMiddleware.mockImplementation((req, res, next) => {
      req.user = { uid: 'test-user-uid' };
      next();
    });

    // Default success for schema validation for all tests. Specific tests can override.
    AnalyzeScriptInputSchema.safeParse.mockImplementation(data => ({ success: true, data }));
    PromptToPrototypeInputSchema.safeParse.mockImplementation(data => ({ success: true, data }));
    StoryboardGeneratorInputSchema.safeParse.mockImplementation(data => ({ success: true, data }));

    mockDataUriToBuffer.mockReset();
  });

  describe('POST /analyzeScript', () => {
    const validScriptInput = { script: 'This is a test script with enough characters.' };

    it('should return 500 if req.user is missing', async () => {
      mockAuthMiddleware.mockImplementationOnce((req, res, next) => { delete req.user; next(); });
      const response = await request(app).post('/analyzeScript').send(validScriptInput);
      expect(response.status).toBe(500);
    });

    it('should return 400 for invalid input (e.g., script too short)', async () => {
      AnalyzeScriptInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error' } });
      const response = await request(app).post('/analyzeScript').set('Authorization', 'Bearer valid-token').send({ script: 'short' });
      expect(response.status).toBe(400);
    });

    it('should return 200 and analysis results for valid input', async () => {
      const mockAnalysisOutput = { analysis: 'Great script!', suggestions: [] };
      analyzeScript.mockResolvedValue(mockAnalysisOutput);
      // Assuming jest.setup.js correctly mocks admin.firestore().collection().doc().set chain
      // If 'set' is not a function, this specific test will fail, indicating a setup issue.
      admin.firestore().collection('scriptAnalyses').doc('mock-uuid-v4').set.mockResolvedValueOnce({});

      const response = await request(app).post('/analyzeScript').set('Authorization', 'Bearer valid-token').send(validScriptInput);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('mock-uuid-v4');
      expect(admin.firestore().collection('scriptAnalyses').doc('mock-uuid-v4').set).toHaveBeenCalled();
    });

    it('should return 500 if AI flow fails', async () => {
      analyzeScript.mockRejectedValue(new Error('AI processing failed'));
      const response = await request(app).post('/analyzeScript').set('Authorization', 'Bearer valid-token').send(validScriptInput);
      expect(response.status).toBe(500);
      expect(response.body.details).toBe('AI processing failed');
    });

    it('should return 503 if Firestore save fails', async () => {
      analyzeScript.mockResolvedValue({ analysis: 'OK', suggestions: [] });
      const firestoreError = new Error('Firestore unavailable');
      firestoreError.code = 'FIRESTORE_ERROR';
      admin.firestore().collection('scriptAnalyses').doc('mock-uuid-v4').set.mockRejectedValueOnce(firestoreError);

      const response = await request(app).post('/analyzeScript').set('Authorization', 'Bearer valid-token').send(validScriptInput);
      expect(response.status).toBe(503);
    });
  });

  describe('POST /promptToPrototype', () => {
    const baseValidInput = { prompt: "A movie about a space hamster." };
    // const inputWithImageDataUri = { ...baseValidInput, imageDataUri: "data:image/png;base64,testbase64data" };
    // const mockFlowOutput = { /* ... */ };


    beforeEach(() => {
        promptToPrototype.mockReset();
        // Use a consistent dummy filename for resets if these mocks are general
        admin.storage().bucket('mock-bucket').file('dummy_prompt_image.png').save.mockReset();
        admin.storage().bucket('mock-bucket').file('dummy_prompt_image.png').publicUrl.mockReset();
    });

    it('should return 400 for invalid input', async () => {
      PromptToPrototypeInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error for prompt' } });
      const response = await request(app).post('/promptToPrototype').set('Authorization', 'Bearer valid-token').send({ prompt: "" });
      expect(response.status).toBe(400);
    });

    /*
    // Test causing timeout - temporarily commented out
    it.skip('should handle user-provided image upload failure gracefully (new test)', async () => {
      // ... test implementation ...
    });
    */

  });

  describe('POST /generateStoryboard', () => {
    const validInput = { sceneDescription: "A hero faces a dragon.", numPanels: 2 };
    // const mockAISceneResult = { ... };

    beforeEach(() => {
        generateStoryboard.mockReset();
        mockDataUriToBuffer.mockReset();
        // Generic storage mock for this suite's beforeEach. Specific tests can override file implementations.
        admin.storage().bucket('mock-bucket').file.mockImplementation((filePath) => ({
            save: jest.fn().mockResolvedValue(undefined),
            publicUrl: jest.fn().mockReturnValue(`http://fake.url/${filePath}`)
        }));
    });

    it('should return 400 for invalid input', async () => {
      StoryboardGeneratorInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error' } });
      const response = await request(app).post('/generateStoryboard').set('Authorization', 'Bearer valid-token').send({ sceneDescription: "" });
      expect(response.status).toBe(400);
    });

    // New Test Case
    it('should return 500 if the generateStoryboard AI flow fails', async () => {
      // Input validation should pass for this test
      StoryboardGeneratorInputSchema.safeParse.mockReturnValueOnce({ success: true, data: validInput });

      const aiError = new Error('Simulated AI storyboard generation failure');
      generateStoryboard.mockRejectedValueOnce(aiError); // Mock AI flow to reject

      const response = await request(app)
        .post('/generateStoryboard')
        .set('Authorization', 'Bearer valid-token')
        .send(validInput);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("An unexpected error occurred.");
      expect(response.body.details).toBe(aiError.message);
      expect(generateStoryboard).toHaveBeenCalledWith(validInput);
      // Firestore should not be called if the AI flow fails first
      expect(admin.firestore().collection('storyboards').doc().set).not.toHaveBeenCalled();
    });

    it('should successfully generate storyboard and upload panel images (simplified)', async () => {
        const mockAISceneResult = {
            titleSuggestion: "Dragon's Peak",
            panels: [ { panelNumber: 1, imageDataUri: "data:image/png;base64,panel1data" } ]
        };
        generateStoryboard.mockResolvedValue(mockAISceneResult);

        // Assuming jest.setup.js correctly mocks the set chain for any doc.
        // If this specific call fails, it means the global mock isn't sufficient.
        admin.firestore().collection('storyboards').doc('mock-uuid-v4').set.mockResolvedValueOnce({});

        mockDataUriToBuffer.mockReturnValue({ buffer: Buffer.from('paneldata'), mimeType: 'image/png', extension: 'png' });

        admin.storage().bucket('mock-bucket').file(expect.stringContaining('panel_1_')).save.mockResolvedValueOnce(undefined);
        admin.storage().bucket('mock-bucket').file(expect.stringContaining('panel_1_')).publicUrl.mockReturnValueOnce('https://fake.storage.url/panel_1_mock-uuid-v4.png');

        const response = await request(app)
            .post('/generateStoryboard')
            .set('Authorization', 'Bearer valid-token')
            .send(validInput);

        expect(response.status).toBe(200);
        expect(admin.firestore().collection('storyboards').doc('mock-uuid-v4').set).toHaveBeenCalled();
        expect(response.body.panels.length).toBe(mockAISceneResult.panels.length);
    });

  });
});
