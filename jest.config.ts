import type { Config } from 'jest';
import dotenv from 'dotenv';
import path from 'path';

const env = process.env.TEST_ENV ?? 'unknown';

// Reporters run in Jest's main process, which never goes through setupFiles
// (that only runs per-worker). Load the env file here too so reporters that
// read process.env (e.g. TestRail credentials) see it at construction time.
if (env !== 'unknown') {
  dotenv.config({ path: path.resolve(__dirname, `.env.${env}`) });
}

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
    '<rootDir>/reporters/testrail-reporter.js',
  ],
  testTimeout: 30000,
};

export default config;
