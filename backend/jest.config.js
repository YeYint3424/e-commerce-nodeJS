module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
};
