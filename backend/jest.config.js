/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  // bcrypt (cost 12) register/login calls can take several seconds on a
  // throttled CI runner — well past Jest's 5s default per-test timeout.
  testTimeout: 20000,
};
