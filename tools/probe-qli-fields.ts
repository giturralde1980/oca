import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const obj     = process.argv[3] ?? 'QuoteLineItem';
  const keyword = (process.argv[4] ?? '').toLowerCase();
  const fields = await sf.describeFields(
    obj,
    f => keyword
      ? f.name.toLowerCase().includes(keyword) || f.label.toLowerCase().includes(keyword)
      : f.name.endsWith('__c'),
  );
  console.log(JSON.stringify(fields.map(f => ({ name: f.name, label: f.label })), null, 2));
  console.log(`\nTotal: ${fields.length}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
