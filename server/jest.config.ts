import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'], // Where to find tests
    verbose: true, // Show detailed output
    forceExit: true, // Force exit after tests are complete
    clearMocks: true, // Clear mocks between tests
};

export default config; 
