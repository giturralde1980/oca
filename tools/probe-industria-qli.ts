import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const rows = await sf.query(
    `SELECT Id, PricebookEntryId, UnitPrice, Quantity, SelectedPrice__c,
            Activity__c, Subactivity__c, Holder__c, Asset__c, Actividad_LN__c,
            Discount__c, Subtotal__c, Taxes__c, TaxesTotal__c, Fee__c, Description
     FROM QuoteLineItem WHERE QuoteId = '0Q0JW0000083YJt0AM' LIMIT 5`
  );
  console.log(JSON.stringify(rows, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
