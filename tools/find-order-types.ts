import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const recs = await sf.query(
    "SELECT OrderType__c, COUNT(Id) total FROM Order WHERE RecordType.Name = 'Pedido de Venta' AND QuoteId = null AND SAPOrderNumber__c != null GROUP BY OrderType__c ORDER BY COUNT(Id) DESC LIMIT 10"
  );
  console.log(JSON.stringify(recs, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
