import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const irId = process.argv[3] ?? 'a1WJW000002ynkf2AA';

  const fields = await sf.describeFields('Integration_Request__c', f => f.name.endsWith('__c'));
  const fieldNames = fields.map(f => f.name).join(', ');
  console.log('Campos custom de Integration_Request__c:', fieldNames);
  console.log('---');

  const records = await sf.query(
    `SELECT Id, ${fieldNames} FROM Integration_Request__c WHERE Id = '${irId}' LIMIT 1`
  );
  console.log(JSON.stringify(records[0] ?? 'NOT FOUND', null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
