module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  globalSetup: '<rootDir>/jest.globalSetup.js',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/jest.setup-env.js'], // Added jest.setup-env.js here
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
 testPathIgnorePatterns: ['<rootDir>/e2e/'],
  clearMocks: true,
 transformIgnorePatterns: [
    'node_modules/(?!(@radix-ui|lucide-react|jose|bson|mongoose|whatwg-fetch|firebase-admin|firebase-functions|chai|sinon|jwks-rsa|react-day-picker)/)' // Still need to investigate bson in portfolio.test.js
  ],
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
