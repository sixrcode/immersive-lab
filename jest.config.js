module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx', // Override tsconfig.json's "jsx": "preserve" for Jest
      },
    }],
  },
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  transformIgnorePatterns: [], // Transform all node_modules
};
