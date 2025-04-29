"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'], // Where to find tests
    verbose: true, // Show detailed output
    forceExit: true, // Force exit after tests are complete
    clearMocks: true, // Clear mocks between tests
};
exports.default = config;
