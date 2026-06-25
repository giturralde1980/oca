import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const ids = ['001JW000007SxPKYA0', '001JW000007SxPjYAK'];

  // Basic fields first
  const recs = await sf.query(
    `SELECT Id, Name, AccountNumber, RecordType.Name, RecordType.DeveloperName
     FROM Account WHERE Id IN ('${ids.join("','")}')`,
  );
  console.log('--- Basic fields ---');
  console.log(JSON.stringify(recs, null, 2));

  // All custom fields on each account (fetch raw sobject)
  const token = await sf.getToken();
  const https = await import('https');
  for (const id of ids) {
    await new Promise<void>((resolve) => {
      const url = new URL(`https://ocaglobal--qa.sandbox.my.salesforce.com/services/data/v59.0/sobjects/Account/${id}`);
      https.default.get({ hostname: url.hostname, path: url.pathname, headers: { Authorization: `Bearer ${token}` } }, (res) => {
        const c: Buffer[] = [];
        res.on('data', (d: Buffer) => c.push(d));
        res.on('end', () => {
          const obj = JSON.parse(Buffer.concat(c).toString());
          const custom = Object.fromEntries(Object.entries(obj).filter(([k, v]) => k.endsWith('__c') && v !== null));
          console.log(`\n--- Custom fields for ${id} (${obj.Name}) ---`);
          console.log(JSON.stringify(custom, null, 2));
          resolve();
        });
      }).on('error', (e: Error) => { console.error(e.message); resolve(); });
    });
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
