module.exports = {
  testEnvironment: 'node',
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>'], // Adjusted to look in the root for tests if they are not in src
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/__tests__/**/*.+(js|jsx)', // Assuming tests are JS/JSX
    '**/?(*.)+(spec|test).+(js|jsx)',
  ],
  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  // Ensure mongoose and its dependencies (like bson, mongodb) are transformed
  transformIgnorePatterns: ['/node_modules/(?!(mongoose|bson|mongodb)/)'],
  // If you have specific Babel configurations or need to transform JS files:
  transform: {
     '^.+\\.jsx?$': 'babel-jest', // For JS/JSX files using Babel
  },
  // Consider adding global setup/teardown if needed for MongoDB Memory Server similar to collaboration-service
  // globalSetup: './test/globalSetup.js', // Example
  // globalTeardown: './test/globalTeardown.js', // Example
  testTimeout: 30000,
};
