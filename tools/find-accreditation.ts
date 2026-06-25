import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';

const sf = new SalesforceQueryHelper();

const candidates = [
  'SELECT Id, Name FROM Acreditacion__c WHERE IsDeleted = false LIMIT 3',
  'SELECT Id, Name FROM Accreditation__c WHERE IsDeleted = false LIMIT 3',
  'SELECT Id, Name FROM Employee_Accreditation__c WHERE IsDeleted = false LIMIT 3',
  'SELECT Id, Name FROM WorkerAccreditation__c WHERE IsDeleted = false LIMIT 3',
];

async function main(): Promise<void> {
  for (const q of candidates) {
    try {
      const recs = await sf.query(q);
      if (recs.length > 0) {
        console.log(`\nFound with: ${q}`);
        console.log(JSON.stringify(recs, null, 2));
        return;
      }
      console.log(`No results: ${q.split('FROM')[1].split('WHERE')[0].trim()}`);
    } catch (e: unknown) {
      console.log(`Error: ${(e as Error).message.split('\n')[0]}`);
    }
  }
  console.log('\nNo accreditation object found — ask backend for the exact API name.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
