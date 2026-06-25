import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const orders = await sf.query(
    `SELECT Id, OrderNumber, Status, SAPOrderNumber__c, QuoteId,
            RecordType.Name, Division__c, BusinessLine__c, CreatedDate,
            EffectiveDate
     FROM Order
     WHERE CreatedDate = TODAY
       AND RecordType.Name = 'Pedido de Venta'
       AND Division__c = 'INS'
     ORDER BY CreatedDate DESC
     LIMIT 5`
  );
  console.log(JSON.stringify(orders, null, 2));

  const latest = orders[0] as Record<string, unknown> | undefined;
  if (latest?.['Id']) {
    console.log('\n═══ Integration Requests del Order más reciente ═══');
    const ir = await sf.query(
      `SELECT Id, Status__c, CreatedDate
       FROM Integration_Request__c
       WHERE SF_Record_Id__c = '${latest['Id']}'
       ORDER BY CreatedDate DESC`
    );
    console.log(JSON.stringify(ir, null, 2));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
