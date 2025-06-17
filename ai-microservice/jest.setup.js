// --- Mock Firebase Admin SDK ---
jest.mock('firebase-admin', () => {
  const mockAuth = {
    verifyIdToken: jest.fn(),
  };

  const mockDoc = {
    set: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(() => mockDoc),
  };

  const mockFirestore = {
    collection: jest.fn(() => mockCollection),
    FieldValue: {
      serverTimestamp: jest.fn(() => new Date()), // Mock serverTimestamp
    }
  };

  const mockFile = {
    save: jest.fn(),
    publicUrl: jest.fn(), // Simpler to mock than getSignedUrl for basic tests
  };

  const mockBucket = {
    file: jest.fn(() => mockFile),
  };

  const mockStorage = {
    bucket: jest.fn(() => mockBucket),
  };

  return {
    initializeApp: jest.fn(), // Mock initializeApp as it's called in index.js
    auth: () => mockAuth,
    firestore: () => mockFirestore,
    storage: () => mockStorage,
  };
});

// --- Mock AI Flow Functions ---
// Note: The paths here must exactly match how they are require()d in index.js
jest.mock('./src/flows/ai-script-analyzer', () => ({
  analyzeScript: jest.fn(),
  AnalyzeScriptInputSchema: { safeParse: jest.fn((data) => ({ success: true, data })) }, // Mock Zod schema validation
}));

jest.mock('./src/flows/prompt-to-prototype', () => ({
  promptToPrototype: jest.fn(),
  PromptToPrototypeInputSchema: { safeParse: jest.fn((data) => ({ success: true, data })) },
}));

jest.mock('./src/flows/storyboard-generator-flow', () => ({
  generateStoryboard: jest.fn(),
  StoryboardGeneratorInputSchema: { safeParse: jest.fn((data) => ({ success: true, data })) },
}));

// --- Mock Utility functions (like dataUriToBuffer, if they have side effects or are complex) ---
// Assuming dataUriToBuffer is simple enough not to need a deep mock for now,
// but if it had external dependencies or complex logic, it could be mocked:
jest.mock('./src/utils', () => ({
  ...jest.requireActual('./src/utils'), // Import actual implementations
  // dataUriToBuffer: jest.fn(), // Only if specific mock behavior is needed
}));


// --- Mock UUID ---
// To ensure predictable IDs during tests for snapshots or direct comparison.
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// --- Mock ./src/auth.js ---
// This is important if authenticate middleware itself has complex logic or dependencies
// For now, index.js directly imports and uses it. The firebase-admin mock above should cover its needs.
// If auth.js itself needed mocking (e.g. if it read external config), it would be done here.
// jest.mock('./src/auth', () => ({
//   authenticate: jest.fn((req, res, next) => {
//     // A simple pass-through mock for the middleware for most tests,
//     // or specific mock per test suite if needed.
//     // For testing the middleware itself, you wouldn't mock it.
//     req.user = { uid: 'test-user-uid' }; // Simulate successful authentication
//     next();
//   }),
// }));


// --- Global Test Setup ---
// Example: Reset mocks before each test if not using clearMocks in jest.config.js
// beforeEach(() => {
//   jest.clearAllMocks(); // Or reset specific mocks
// });

console.log('jest.setup.js loaded and mocks applied.');
