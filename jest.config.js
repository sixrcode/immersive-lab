module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    '^@/components/ui/use-toast$': '<rootDir>/src/components/ui/toast.tsx', // More specific mapping
    '^@/(.*)$': '<rootDir>/src/$1', // Keep the general one as fallback
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx', // Override tsconfig.json's "jsx": "preserve" for Jest
      },
    }],
  },
  // Automatically clear mock calls and instances between every test
  testPathIgnorePatterns: ['<rootDir>/e2/'],
  clearMocks: true,
  transformIgnorePatterns: ['node_modules/(?!(?:mongoose|bson)/.*.mjs$)'], // Transform all node_modules except mongoose and bson
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
