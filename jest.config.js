module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^configstore$': '<rootDir>/test/__mocks__/configstore.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};