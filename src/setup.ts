import dotenv from 'dotenv';
import path from 'path';

const env = process.env.TEST_ENV;
const validEnvs = ['int', 'qa', 'stg', 'prd', 'carladev'];

if (!env || !validEnvs.includes(env)) {
  throw new Error(
    `TEST_ENV must be one of: ${validEnvs.join(', ')}. Got: "${env ?? ''}"\n` +
    `Example: cross-env TEST_ENV=qa npm test`
  );
}

dotenv.config({ path: path.resolve(__dirname, `../.env.${env}`) });
