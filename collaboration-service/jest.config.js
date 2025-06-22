module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './src/test/globalSetup.ts',
  globalTeardown: './src/test/globalTeardown.ts',
  setupFilesAfterEnv: ['./src/test/setup.ts'], // For per-test-file setup like clearing collections
  testTimeout: 30000, // Increase test timeout to 30 seconds
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/src'],
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest', // Ensure js/jsx are also handled if any exist
  },
  transformIgnorePatterns: ['/node_modules/(?!(lucide-react|d3-\\w*|unist-\\w*|jose|jwks-rsa|firebase-admin|@firebase|mongoose|bson|mongodb)/)'],
};
