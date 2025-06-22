module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  coverageDirectory: 'coverage',
  roots: ['<rootDir>'],
  testMatch: [
    '**/test/**/*.test.js', // Adjusted to target .test.js files in the test directory
  ],
  // Ensure chai (and any other ESM modules causing issues) are transformed
  transformIgnorePatterns: [
    '/node_modules/(?!(chai)/)', // Add other problematic ESM modules here if needed
  ],
  // If using Babel for JS transformation (common for Jest with Node projects)
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  // testTimeout: 30000, // Optional: if tests are timing out
};
