module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'utils/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 45,
      statements: 45
    },
    './utils/bookingValidator.js': {
      branches: 90,
      functions: 100,
      lines: 98,
      statements: 98
    }
  },
  verbose: true,
  testTimeout: 30000
};
