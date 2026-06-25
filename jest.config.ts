import type { Config } from 'jest';

const env = process.env.TEST_ENV ?? 'unknown';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/tests/**/*.spec.ts'],
  setupFiles: ['<rootDir>/setup.ts'],
  globalTeardown: '<rootDir>/globalTeardown.ts',
  reporters: [
    'default',
    [
      'jest-html-reporter',
      {
        pageTitle: `Salesforce API Test Report — ${env.toUpperCase()}`,
        outputPath: `./reports/test-report-${env}.html`,
        includeFailureMsg: true,
        includeSuiteFailure: true,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './reports',
        outputName: `junit-${env}.xml`,
      },
    ],
  ],
  testTimeout: 30000,
};

export default config;
