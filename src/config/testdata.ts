import * as fs from 'fs';
import * as path from 'path';

const cache = new Map<string, unknown>();

/**
 * Reads testdata/<TEST_ENV>/<file>.json — the single source of truth for every
 * Salesforce Id/picklist value that differs per sandbox (RecordTypeIds, Accounts,
 * Users, BillingProfiles, Pricebooks, Delegations...).
 *
 * Fails loudly instead of falling back to another environment's file: a silent
 * fallback would mean a test could run against qa data while pointed at uat (or
 * vice versa) without anyone noticing.
 */
export function getTestData<T>(file: string): T {
  const env = process.env.TEST_ENV || 'qa';
  const key = `${env}/${file}`;
  if (cache.has(key)) return cache.get(key) as T;

  const filePath = path.join(__dirname, '..', '..', 'testdata', env, `${file}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`No testdata/${env}/${file}.json — falta mapear este entorno (ver testdata/qa/${file}.json como referencia)`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  cache.set(key, data);
  return data;
}
