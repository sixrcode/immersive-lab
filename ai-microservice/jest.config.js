module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/src', '<rootDir>/tests'], // Assuming tests might be in a separate /tests folder or alongside src
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: ['/node_modules/(?!(lucide-react|d3-\\w*|unist-\\w*|jose|jwks-rsa|firebase-admin|@firebase|mongoose|bson|chai|nanoid|firebase-functions)/)'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['ts-jest', { // Added mjs and transform block
      tsconfig: {
        // We might need specific tsconfig overrides for this workspace
        allowJs: true, // Allow ts-jest to process JS files from node_modules
        // jsx: 'react-jsx' // Not typically needed for node environment
      }
    }],
  },
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  // Setup files to run before each test file
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // if we need a setup file for mocks
  testPathIgnorePatterns: ['<rootDir>/../../e2e/'],
};
