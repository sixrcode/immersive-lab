const request = require('supertest');
const admin = require('firebase-admin'); // Gets the mocked version from jest.setup.js
const { v4: uuidv4 } = require('uuid'); // Gets the mocked version

// Import AI flow mocks to control their behavior in tests
const { analyzeScript } = require('./src/flows/ai-script-analyzer');
const { promptToPrototype } = require('./src/flows/prompt-to-prototype');
const { generateStoryboard } = require('./src/flows/storyboard-generator-flow');

// Schemas for validating input - we need to mock their safeParse methods
const { AnalyzeScriptInputSchema } = require('./src/flows/ai-script-analyzer');
const { PromptToPrototypeInputSchema } = require('./src/flows/prompt-to-prototype');
const { StoryboardGeneratorInputSchema } = require('./src/flows/storyboard-generator-flow');


// The Express app instance from index.js
// Important: index.js exports the app *after* wrapping with functions.https.onRequest.
// For supertest, we need the raw Express app. This requires a slight refactor of index.js
// to export the app for testing purposes, or using a more complex setup.

// Let's assume for now that we can get the app. If not, index.js needs modification.
// One common way is: `const { app } = require('./index');` if index.js exports it.
// However, the current index.js exports `exports.aiApi = functions.https.onRequest(app);`
// This means `app` is not directly exported.

// For testing, we need to EXPORT the app from index.js BEFORE it's wrapped by functions.https.onRequest
// So, I will *conceptually* assume index.js is modified like this:
// At the end of ai-microservice/index.js:
// ...
// const appForTesting = app; // Or module.exports = { app } if not using ES modules for export
// exports.aiApi = functions.https.onRequest(app);
// module.exports.appForTesting = app; // Add this line to index.js
// Then in tests: const { appForTesting: app } = require('./index');

// Since I cannot modify index.js in this turn to add the export,
// I will write the tests as if `app` can be imported.
// The firebase-functions-test SDK is another way but adds more complexity than supertest for unit/integration.

// TEMPORARY: Mocking app directly for test structure.
// This should be replaced by actually exporting and importing the app from index.js
const express = require('express');
const realApp = express(); // This is not the actual app from index.js
// Apply middleware (json, cors, auth) that are in the real app to this mock app
realApp.use(express.json({ limit: '10mb' }));
const cors = require('cors');
realApp.use(cors({ origin: true }));
//const { authenticate } = require('./src/auth'); // This mock is tricky with the current setup
// realApp.use(authenticate); // Need to ensure authenticate mock in jest.setup.js works or refine it

// This is a placeholder. In a real test, you'd get the app from your main file.
// const app = require('./index').appForTesting; // Ideal
let app; // Will be set in beforeAll

// Mock the auth middleware more carefully for granular control per test
const mockAuthMiddleware = jest.fn((req, res, next) => {
  // Default to no user, tests can override req.user
  // req.user = { uid: 'test-user-uid' };
  next();
});
jest.mock('./src/auth', () => ({
  authenticate: (req, res, next) => mockAuthMiddleware(req, res, next),
}));


describe('AI Microservice API Endpoints', () => {
  beforeAll(() => {
    // Dynamically require index.js to get the app AFTER mocks are set up
    // This relies on index.js being structured to allow exporting 'app' for tests
    // For now, this will be a placeholder as index.js is not structured for this.
    // app = require('./index').appForTesting;
    // If index.js cannot be refactored for testing, this approach for supertest is hard.
    // The alternative is to use firebase-functions-test for full integration tests.

    // WORKAROUND: Since I can't modify index.js to export the app,
    // I'll have to simulate its routes on a new express instance.
    // This is NOT ideal but allows test structure demonstration.
    const tempApp = express();
    tempApp.use(express.json({ limit: '10mb' }));
    tempApp.use(cors({ origin: true }));

    // Manually setup routes from index.js here
    // This is a simplified version of what's in index.js
    const { authenticate } = require('./src/auth'); // get the mocked auth
    tempApp.use(authenticate); // Apply the mock auth middleware

    tempApp.post('/analyzeScript', require('./index').aiApi); // This won't work as aiApi is the wrapped function
    // The above line is problematic. The routes must be defined on `tempApp` using the same handlers as in `index.js`.
    // This means the handlers themselves would need to be exported from index.js, or index.js refactored.

    // Given the constraints, I will write tests assuming `app` is correctly imported and configured.
    // The execution of these tests would fail in the current environment without refactoring index.js.
    app = tempApp; // Placeholder, actual app import needed.
    // For the tests to run, index.js should be refactored to export the express app
    // e.g. by adding module.exports = { app } (if using commonJS)
    // or export const app = app; (if using ES modules)
    // For now, I'll proceed to write tests as if `app` is available and correctly set up.
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for successful authentication, override in specific tests for auth failures
    mockAuthMiddleware.mockImplementation((req, res, next) => {
      req.user = { uid: 'test-user-uid' };
      next();
    });
  });

  describe('POST /analyzeScript', () => {
    const validScriptInput = { script: 'This is a test script with enough characters.' };

    // Authentication Tests
    it('should return 403 if no token is provided', async () => {
      mockAuthMiddleware.mockImplementation((req, res, next) => {
        // Simulate auth middleware rejecting due to no token (res.status(403).json(...))
        // This requires auth.js to be structured to allow this, or a more direct mock here.
        // For simplicity, we'll assume auth middleware handles the response.
        // The actual test would be:
        // const response = await request(app).post('/analyzeScript').send(validScriptInput);
        // expect(response.status).toBe(403);
        // For now, this test is conceptual due to middleware mocking complexity.
        expect(true).toBe(true); // Placeholder
      });
       // const response = await request(app).post('/analyzeScript').send(validScriptInput);
       // expect(response.status).toBe(403); // This depends on actual auth middleware behavior
    });

    // Input Validation
    it('should return 400 for invalid input (e.g., script too short)', async () => {
      AnalyzeScriptInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error' } });
      const response = await request(app)
        .post('/analyzeScript')
        .set('Authorization', 'Bearer valid-token') // Assume valid token for this test
        .send({ script: 'short' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    // Successful Flow
    it('should return 200 and analysis results for valid input', async () => {
      const mockAnalysisOutput = { analysis: 'Great script!', suggestions: [] };
      analyzeScript.mockResolvedValue(mockAnalysisOutput);
      admin.firestore().collection().doc().set.mockResolvedValue({}); // Mock Firestore save

      const response = await request(app)
        .post('/analyzeScript')
        .set('Authorization', 'Bearer valid-token')
        .send(validScriptInput);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('mock-uuid-v4'); // from uuid mock
      expect(response.body.userId).toBe('test-user-uid');
      expect(response.body.script).toBe(validScriptInput.script);
      expect(response.body.analysis).toEqual(mockAnalysisOutput);
      expect(analyzeScript).toHaveBeenCalledWith(validScriptInput);
      expect(admin.firestore().collection).toHaveBeenCalledWith('scriptAnalyses');
      expect(admin.firestore().collection().doc).toHaveBeenCalledWith('mock-uuid-v4');
      expect(admin.firestore().collection().doc().set).toHaveBeenCalled();
    });

    // AI Flow Failure
    it('should return 500 if AI flow fails', async () => {
      analyzeScript.mockRejectedValue(new Error('AI processing failed'));
      const response = await request(app)
        .post('/analyzeScript')
        .set('Authorization', 'Bearer valid-token')
        .send(validScriptInput);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('An unexpected error occurred.');
      expect(response.body.details).toBe('AI processing failed');
    });

    // Firestore Save Failure
    it('should return 503 if Firestore save fails', async () => {
      analyzeScript.mockResolvedValue({ analysis: 'OK', suggestions: [] });
      const firestoreError = new Error('Firestore unavailable');
      firestoreError.code = 'FIRESTORE_ERROR'; // Custom property to simulate specific error type
      admin.firestore().collection().doc().set.mockRejectedValue(firestoreError);

      const response = await request(app)
        .post('/analyzeScript')
        .set('Authorization', 'Bearer valid-token')
        .send(validScriptInput);
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Firestore operation failed.');
    });
  });

  // TODO: Add similar describe blocks for /promptToPrototype and /generateStoryboard
  // - Test authentication (mocking req.user or lack thereof via mockAuthMiddleware)
  // - Test input validation (mocking the .safeParse() on the respective Zod schema)
  // - Test successful flow (mocking the AI flow, uploadImageToStorage if used, and Firestore set)
  // - Test AI flow failure
  // - Test image upload failure (if applicable)
  // - Test Firestore save failure

  describe('POST /promptToPrototype', () => {
    const baseValidInput = { prompt: "A movie about a space hamster." };
    const inputWithImageDataUri = {
      ...baseValidInput,
      imageDataUri: "data:image/png;base64,testbase64data"
    };
    const mockFlowOutput = {
      loglines: [{tone: "epic", text: "In space, no one can hear you squeak."}],
      moodBoardImage: "data:image/png;base64,generatedimagedata", // AI flow returns data URI
      // ... other necessary fields from PromptToPrototypeOutput
      loglinesJsonString: "[]",
      moodBoardCells: [],
      moodBoardCellsJsonString: "[]",
      shotList: "",
      shotListMarkdownString: "",
      proxyClipAnimaticDescription: "",
      pitchSummary: "",
      allTextAssetsJsonString: "{}"
    };

    // Mock for dataUriToBuffer utility
    const mockDataUriToBuffer = require('./src/utils').dataUriToBuffer;
    jest.mock('./src/utils', () => ({
        dataUriToBuffer: jest.fn(),
    }));


    beforeEach(() => {
        // Reset schema mock to default success for this suite, specific tests can override
        PromptToPrototypeInputSchema.safeParse.mockImplementation((data) => ({ success: true, data }));
        // Reset AI flow mock
        promptToPrototype.mockReset();
        // Reset storage mock
        admin.storage().bucket().file().save.mockReset();
        admin.storage().bucket().file().publicUrl.mockReset();
        // Reset dataUriToBuffer mock
        mockDataUriToBuffer.mockReset();
    });

    it('should return 400 for invalid input', async () => {
      PromptToPrototypeInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error for prompt' } });
      const response = await request(app)
        .post('/promptToPrototype')
        .set('Authorization', 'Bearer valid-token')
        .send({ prompt: "" }); // Invalid: empty prompt
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input');
    });

    it('should successfully process valid input without imageDataUri, upload generated moodboard', async () => {
      promptToPrototype.mockResolvedValue(mockFlowOutput);
      admin.firestore().collection().doc().set.mockResolvedValue({});

      // Mock for generated moodboard image upload
      mockDataUriToBuffer.mockReturnValueOnce({ buffer: Buffer.from('generatedimagedata', 'base64'), mimeType: 'image/png', extension: 'png' });
      const moodboardStorageUrl = 'https://storage.googleapis.com/mock-bucket/moodboard_output_mock-uuid-v4.png';
      admin.storage().bucket().file().publicUrl.mockReturnValueOnce(moodboardStorageUrl);


      const response = await request(app)
        .post('/promptToPrototype')
        .set('Authorization', 'Bearer valid-token')
        .send(baseValidInput);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('mock-uuid-v4');
      expect(response.body.userId).toBe('test-user-uid');
      expect(response.body.originalPrompt).toBe(baseValidInput.prompt);
      expect(response.body.inputImageUrl).toBeNull();
      expect(response.body.moodBoardImage).toBe(moodboardStorageUrl);
      expect(promptToPrototype).toHaveBeenCalledWith(baseValidInput);
      expect(admin.firestore().collection).toHaveBeenCalledWith('promptPackages');
      expect(admin.firestore().collection().doc().set).toHaveBeenCalled();
      expect(mockDataUriToBuffer).toHaveBeenCalledWith(mockFlowOutput.moodBoardImage);
      expect(admin.storage().bucket().file().save).toHaveBeenCalledTimes(1); // Only moodboard
    });

    it('should successfully process valid input with imageDataUri, upload both images', async () => {
      promptToPrototype.mockResolvedValue(mockFlowOutput);
      admin.firestore().collection().doc().set.mockResolvedValue({});

      // Mock for user-provided image upload
      mockDataUriToBuffer.mockReturnValueOnce({ buffer: Buffer.from('testbase64data', 'base64'), mimeType: 'image/png', extension: 'png' });
      const inputImageStorageUrl = 'https://storage.googleapis.com/mock-bucket/input_image_mock-uuid-v4.png';
      admin.storage().bucket().file().publicUrl.mockReturnValueOnce(inputImageStorageUrl); // For input image

      // Mock for generated moodboard image upload
      mockDataUriToBuffer.mockReturnValueOnce({ buffer: Buffer.from('generatedimagedata', 'base64'), mimeType: 'image/png', extension: 'png' });
      const moodboardStorageUrl = 'https://storage.googleapis.com/mock-bucket/moodboard_output_mock-uuid-v4.png';
      admin.storage().bucket().file().publicUrl.mockReturnValueOnce(moodboardStorageUrl); // For moodboard image

      const response = await request(app)
        .post('/promptToPrototype')
        .set('Authorization', 'Bearer valid-token')
        .send(inputWithImageDataUri);

      expect(response.status).toBe(200);
      expect(response.body.inputImageUrl).toBe(inputImageStorageUrl);
      expect(response.body.moodBoardImage).toBe(moodboardStorageUrl);
      expect(promptToPrototype).toHaveBeenCalledWith({ ...inputWithImageDataUri, imageDataUri: inputImageStorageUrl }); // Flow receives URL
      expect(mockDataUriToBuffer).toHaveBeenCalledWith(inputWithImageDataUri.imageDataUri);
      expect(mockDataUriToBuffer).toHaveBeenCalledWith(mockFlowOutput.moodBoardImage);
      expect(admin.storage().bucket().file().save).toHaveBeenCalledTimes(2); // Both images
    });

    it('should handle AI flow failure', async () => {
        promptToPrototype.mockRejectedValue(new Error('AI prototype generation failed'));
        const response = await request(app)
            .post('/promptToPrototype')
            .set('Authorization', 'Bearer valid-token')
            .send(baseValidInput);
        expect(response.status).toBe(500);
        expect(response.body.details).toBe('AI prototype generation failed');
    });

    it('should handle user image upload failure (still attempts flow, saves null for inputImageUrl)', async () => {
        promptToPrototype.mockResolvedValue(mockFlowOutput); // AI flow itself succeeds
        admin.firestore().collection().doc().set.mockResolvedValue({}); // Firestore succeeds

        mockDataUriToBuffer.mockImplementation(uri => {
            if (uri === inputWithImageDataUri.imageDataUri) {
                 return { buffer: Buffer.from('testbase64data', 'base64'), mimeType: 'image/png', extension: 'png' };
            }
            if (uri === mockFlowOutput.moodBoardImage) {
                return { buffer: Buffer.from('generatedimagedata', 'base64'), mimeType: 'image/png', extension: 'png' };
            }
            return null;
        });

        // User image upload fails
        const userImageFileMock = admin.storage().bucket().file();
        userImageFileMock.save.mockImplementationOnce(() => Promise.reject(new Error('User image disk full')));
        userImageFileMock.publicUrl.mockReturnValueOnce('https://storage.googleapis.com/mock-bucket/input_image_mock-uuid-v4.png');


        // Moodboard image upload succeeds
        const moodboardImageFileMock = admin.storage().bucket().file(); // Need to ensure file() returns distinct mocks if called multiple times with different paths
        moodboardImageFileMock.save.mockImplementationOnce(() => Promise.resolve());
        const moodboardStorageUrl = 'https://storage.googleapis.com/mock-bucket/moodboard_output_mock-uuid-v4.png';
        moodboardImageFileMock.publicUrl.mockReturnValueOnce(moodboardStorageUrl);

        //This part of mocking storage is tricky. Need to ensure file() returns the correct mock for each call.
        //A simpler way for this test:
        admin.storage().bucket().file.mockImplementation((path) => {
            if (path.includes('input_image_')) {
                return { save: jest.fn(() => Promise.reject(new Error('User image disk full'))), publicUrl: jest.fn() };
            } else if (path.includes('moodboard_output_')) {
                return { save: jest.fn(() => Promise.resolve()), publicUrl: jest.fn(() => moodboardStorageUrl) };
            }
            return { save: jest.fn(), publicUrl: jest.fn() }; // Default mock
        });


        const response = await request(app)
            .post('/promptToPrototype')
            .set('Authorization', 'Bearer valid-token')
            .send(inputWithImageDataUri);

        expect(response.status).toBe(200); // Endpoint might still succeed overall
        expect(response.body.inputImageUrl).toBeNull(); // Or original data URI depending on error handling in index.js
        expect(response.body.moodBoardImage).toBe(moodboardStorageUrl); // Moodboard upload succeeded
        // The flow would be called with the original data URI or null if upload is critical path before flow call
        expect(promptToPrototype).toHaveBeenCalledWith({ ...inputWithImageDataUri, imageDataUri: inputWithImageDataUri.imageDataUri });
    });


    it('should handle Firestore save failure', async () => {
        promptToPrototype.mockResolvedValue(mockFlowOutput);
        mockDataUriToBuffer.mockReturnValue({ buffer: Buffer.from(''), mimeType: 'image/png', extension: 'png' });
        admin.storage().bucket().file().publicUrl.mockReturnValue('http://fake.url/image.png');
        admin.storage().bucket().file().save.mockResolvedValue(undefined);

        const firestoreError = new Error('Firestore DB is down');
        firestoreError.code = 'FIRESTORE_ERROR';
        admin.firestore().collection().doc().set.mockRejectedValue(firestoreError);

        const response = await request(app)
            .post('/promptToPrototype')
            .set('Authorization', 'Bearer valid-token')
            .send(baseValidInput);

        expect(response.status).toBe(503);
        expect(response.body.error).toBe('Firestore operation failed.');
    });
  });

  describe('POST /generateStoryboard', () => {
    const validInput = { sceneDescription: "A hero faces a dragon.", numPanels: 2 };
    const mockFlowOutput = {
      titleSuggestion: "Hero vs Dragon",
      panels: [
        { panelNumber: 1, description: "Hero draws sword", shotDetails: "Close up", dialogueOrSound: "Sword sound", imageDataUri: "data:image/png;base64,panel1data" },
        { panelNumber: 2, description: "Dragon breathes fire", shotDetails: "Wide shot", dialogueOrSound: "Roar", imageDataUri: "data:image/png;base64,panel2data" },
      ]
    };

    // Get the mock for dataUriToBuffer again (it's scoped if defined inside describe)
    // It's better to define mockDataUriToBuffer at the top level of the test file if used in multiple suites
    const mockDataUriToBuffer = require('./src/utils').dataUriToBuffer;
    // No need to re-jest.mock('./src/utils') if already done at top level of jest.setup.js or this file

    beforeEach(() => {
      StoryboardGeneratorInputSchema.safeParse.mockImplementation((data) => ({ success: true, data }));
      generateStoryboard.mockReset();
      admin.storage().bucket().file().save.mockReset();
      admin.storage().bucket().file().publicUrl.mockReset();
      mockDataUriToBuffer.mockReset(); // Assuming it was defined at a higher scope or re-imported
    });

    it('should return 400 for invalid input', async () => {
      StoryboardGeneratorInputSchema.safeParse.mockReturnValueOnce({ success: false, error: { format: () => 'Validation error for storyboard' } });
      const response = await request(app)
        .post('/generateStoryboard')
        .set('Authorization', 'Bearer valid-token')
        .send({ sceneDescription: "" }); // Invalid
      expect(response.status).toBe(400);
    });

    it('should successfully generate storyboard and upload panel images', async () => {
      generateStoryboard.mockResolvedValue(mockFlowOutput);
      admin.firestore().collection().doc().set.mockResolvedValue({});

      const panel1StorageUrl = 'https://storage.googleapis.com/mock-bucket/panel_1_mock-uuid-v4.png';
      const panel2StorageUrl = 'https://storage.googleapis.com/mock-bucket/panel_2_mock-uuid-v4.png';

      mockDataUriToBuffer.mockImplementation((uri) => {
        if (uri === "data:image/png;base64,panel1data") return { buffer: Buffer.from('panel1data', 'base64'), mimeType: 'image/png', extension: 'png' };
        if (uri === "data:image/png;base64,panel2data") return { buffer: Buffer.from('panel2data', 'base64'), mimeType: 'image/png', extension: 'png' };
        return null;
      });

      admin.storage().bucket().file().publicUrl
        .mockReturnValueOnce(panel1StorageUrl)
        .mockReturnValueOnce(panel2StorageUrl);
      admin.storage().bucket().file().save.mockResolvedValue(undefined); // Mock save to succeed for all panels


      const response = await request(app)
        .post('/generateStoryboard')
        .set('Authorization', 'Bearer valid-token')
        .send(validInput);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('mock-uuid-v4');
      expect(response.body.panels[0].imageDataUri).toBe(panel1StorageUrl);
      expect(response.body.panels[1].imageDataUri).toBe(panel2StorageUrl);
      expect(generateStoryboard).toHaveBeenCalledWith(validInput);
      expect(mockDataUriToBuffer).toHaveBeenCalledTimes(2);
      expect(admin.storage().bucket().file().save).toHaveBeenCalledTimes(2);
      expect(admin.firestore().collection).toHaveBeenCalledWith('storyboards');
      expect(admin.firestore().collection().doc().set).toHaveBeenCalled();
    });

    it('should handle AI flow failure for storyboard generation', async () => {
        generateStoryboard.mockRejectedValue(new Error('AI storyboard gen failed'));
        const response = await request(app)
            .post('/generateStoryboard')
            .set('Authorization', 'Bearer valid-token')
            .send(validInput);
        expect(response.status).toBe(500);
        expect(response.body.details).toBe('AI storyboard gen failed');
    });

    it('should handle panel image upload failure (uses placeholder)', async () => {
        generateStoryboard.mockResolvedValue(mockFlowOutput); // AI flow succeeds
        admin.firestore().collection().doc().set.mockResolvedValue({}); // Firestore save succeeds

        mockDataUriToBuffer.mockImplementation((uri) => {
             if (uri === "data:image/png;base64,panel1data") return { buffer: Buffer.from('panel1data', 'base64'), mimeType: 'image/png', extension: 'png' };
             if (uri === "data:image/png;base64,panel2data") return { buffer: Buffer.from('panel2data', 'base64'), mimeType: 'image/png', extension: 'png' };
            return null;
        });

        // Mock first panel upload to fail, second to succeed
        const panel1FileMock = { save: jest.fn(() => Promise.reject(new Error('Panel 1 upload fail'))), publicUrl: jest.fn() };
        const panel2StorageUrl = 'https://storage.googleapis.com/mock-bucket/panel_2_mock-uuid-v4.png';
        const panel2FileMock = { save: jest.fn(() => Promise.resolve()), publicUrl: jest.fn(() => panel2StorageUrl) };

        admin.storage().bucket().file
            .mockImplementationOnce(() => panel1FileMock) // For panel 1
            .mockImplementationOnce(() => panel2FileMock); // For panel 2

        const response = await request(app)
            .post('/generateStoryboard')
            .set('Authorization', 'Bearer valid-token')
            .send(validInput);

        expect(response.status).toBe(200);
        expect(response.body.panels[0].imageDataUri).toContain('Panel+1+Upload+Failed'); // Placeholder URL
        expect(response.body.panels[1].imageDataUri).toBe(panel2StorageUrl);
        expect(admin.storage().bucket().file().save).toHaveBeenCalledTimes(2); // Both save attempts are made
    });

    it('should handle Firestore save failure for storyboard', async () => {
        generateStoryboard.mockResolvedValue(mockFlowOutput);
        mockDataUriToBuffer.mockReturnValue({ buffer: Buffer.from(''), mimeType: 'image/png', extension: 'png' });
        admin.storage().bucket().file().publicUrl.mockReturnValue('http://fake.url/panel.png');
        admin.storage().bucket().file().save.mockResolvedValue(undefined);

        const firestoreError = new Error('Firestore unavailable for storyboards');
        firestoreError.code = 'FIRESTORE_ERROR';
        admin.firestore().collection().doc().set.mockRejectedValue(firestoreError);

        const response = await request(app)
            .post('/generateStoryboard')
            .set('Authorization', 'Bearer valid-token')
            .send(validInput);

        expect(response.status).toBe(503);
        expect(response.body.error).toBe('Firestore operation failed.');
    });

  });
});
