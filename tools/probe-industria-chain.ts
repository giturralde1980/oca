import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

const ORDER_ID = process.argv[3] ?? '801JW00001Hri0nYAB';

async function main(): Promise<void> {
  console.log(`\n═══ ORDER (${ORDER_ID}) ═══`);
  const orders = await sf.query(
    `SELECT Id, OrderNumber, Status, SAPOrderNumber__c, ProfitCenter__c,
            QuoteId, Society__c, Division__c, BusinessLine__c, Section__c,
            Activity__c, Actividad_LN__c, Delegation__c, RecordType.Name,
            Holder__c, Payer__c, BillingProfile__c, OrderType__c
     FROM Order WHERE Id = '${ORDER_ID}'`
  );
  const order = orders[0] as Record<string, unknown>;
  console.log(JSON.stringify(order, null, 2));

  const quoteId = order?.['QuoteId'] as string;
  if (quoteId) {
    console.log(`\n═══ QUOTE (${quoteId}) ═══`);
    const quotes = await sf.query(
      `SELECT Id, Name, Status, RecordType.Name, RecordTypeId,
              OpportunityId, Type__c, Division__c, BusinessLine__c,
              Section__c, Society__c, Activity__c, Actividad_LN__c,
              Delegation__c, Holder__c, Payer__c, Pricebook2Id,
              BillingProfile__c, AssignedCommercial__c,
              EntryChannel__c, Origin__c,
              DTT_fld_Precio_neto_2a_visita__c, DTT_fld_Descuento_2a_visita__c
       FROM Quote WHERE Id = '${quoteId}'`
    );
    const quote = quotes[0] as Record<string, unknown>;
    console.log(JSON.stringify(quote, null, 2));

    const oppId = quote?.['OpportunityId'] as string;
    if (oppId) {
      console.log(`\n═══ OPPORTUNITY (${oppId}) ═══`);
      const opps = await sf.query(
        `SELECT Id, Name, StageName, RecordType.Name, RecordTypeId,
                AccountId, Division__c, BusinessLine__c,
                Section__c, Activity__c, Delegation__c, ContactId__c
         FROM Opportunity WHERE Id = '${oppId}'`
      );
      console.log(JSON.stringify(opps[0], null, 2));
    }
  }

  console.log(`\n═══ QUOTE LINE ITEMS ═══`);
  const qli = await sf.query(
    `SELECT Id, PricebookEntryId, UnitPrice, Quantity, SelectedPrice__c,
            Activity__c, Subactivity__c, Holder__c, Asset__c, Actividad_LN__c,
            Discount__c, Subtotal__c, Taxes__c, TaxesTotal__c, Fee__c, Description
     FROM QuoteLineItem WHERE QuoteId = '${order['QuoteId']}' LIMIT 3`
  );
  console.log(JSON.stringify(qli, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
