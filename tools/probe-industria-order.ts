import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

const ORDER_ID = '801JW00001Hri0nYAB';

async function main(): Promise<void> {
  console.log(`\n═══ ORDEN (${ORDER_ID}) ═══`);
  const orders = await sf.query(
    `SELECT Id, OrderNumber, Status, RecordType.Name, RecordTypeId,
            QuoteId, AccountId, Pricebook2Id, Type, OrderType__c,
            Division__c, BusinessLine__c, Section__c, Society__c,
            Activity__c, Actividad_LN__c, Delegation__c,
            Holder__c, Payer__c, Contact__c,
            BillingProfile__c, BillingType__c,
            EffectiveDate, SAPOrderNumber__c
     FROM Order WHERE Id = '${ORDER_ID}'`
  );
  console.log(JSON.stringify(orders[0] ?? 'NOT FOUND', null, 2));

  const order = orders[0] as Record<string, string> | undefined;
  if (!order) {
    console.log(`\n⚠️  Order ${ORDER_ID} no encontrado en env=${env}`);
    return;
  }

  if (order['QuoteId']) {
    console.log(`\n═══ QUOTE (${order['QuoteId']}) ═══`);
    const quotes = await sf.query(
      `SELECT Id, Name, Status, RecordType.Name, RecordTypeId,
              OpportunityId, Type__c, Division__c, BusinessLine__c,
              Section__c, Society__c, Activity__c, Actividad_LN__c,
              Delegation__c, Holder__c, Payer__c, Pricebook2Id,
              BillingProfile__c, TaxType__c, TaxGroup__c,
              AssignedCommercial__c, EntryChannel__c, Origin__c
       FROM Quote WHERE Id = '${order['QuoteId']}'`
    );
    const quote = quotes[0] as Record<string, string> | undefined;
    console.log(JSON.stringify(quote ?? 'NOT FOUND', null, 2));

    if (quote?.['OpportunityId']) {
      console.log(`\n═══ OPPORTUNITY (${quote['OpportunityId']}) ═══`);
      const opps = await sf.query(
        `SELECT Id, Name, StageName, RecordType.Name, RecordTypeId,
                AccountId, Division__c, BusinessLine__c,
                Section__c, Activity__c, Delegation__c, ContactId__c
         FROM Opportunity WHERE Id = '${quote['OpportunityId']}'`
      );
      console.log(JSON.stringify(opps[0] ?? 'NOT FOUND', null, 2));
    }
  }

  console.log(`\n═══ ORDER ITEMS ═══`);
  const items = await sf.query(
    `SELECT Id, Product2Id, Product2.Name, Product2.ProductCode,
            Quantity, UnitPrice, TotalPrice,
            Activity__c, Subactivity__c, Actividad_LN__c,
            PricebookEntryId, Description
     FROM OrderItem WHERE OrderId = '${ORDER_ID}'`
  );
  console.log(JSON.stringify(items, null, 2));

  console.log(`\n═══ WORK ORDER ITEMS (si existen) ═══`);
  try {
    const woi = await sf.query(
      `SELECT Id, Subject, Status, WorkOrderId,
              Product__c, Quantity__c, UnitPrice__c
       FROM WorkOrderLineItem WHERE WorkOrder.SourceObject__c = '${ORDER_ID}'
       LIMIT 10`
    );
    console.log(JSON.stringify(woi, null, 2));
  } catch (e: unknown) {
    console.log(`  (no se pudo consultar WorkOrderLineItem: ${(e as Error).message})`);
  }

  console.log(`\n═══ INTEGRATION REQUESTS ═══`);
  const irecs = await sf.query(
    `SELECT Id, SF_Record_Id__c, Status__c, CreatedDate
     FROM Integration_Request__c
     WHERE SF_Record_Id__c = '${ORDER_ID}'
     ORDER BY CreatedDate DESC LIMIT 5`
  );
  console.log(JSON.stringify(irecs, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
