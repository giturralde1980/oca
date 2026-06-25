import dotenv from 'dotenv';
import path from 'path';
const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';
const sf = new SalesforceQueryHelper();

async function main(): Promise<void> {
  const soql = [
    'SELECT Id, SAPOrderNumber__c, Status, Society__c, Division__c, Section__c,',
    'RecordType.Name, Delegation__c, BusinessLine__c, QuoteId, Type, OrderType__c,',
    'CreatedDate, BillingProfile__c, AccountId, Pricebook2Id, RecordTypeId,',
    'Holder__c, Payer__c, BillingType__c, Activity__c, Actividad_LN__c,',
    'Country__c, Contact__c, AssignedCommercial__c, EffectiveDate, ProfitCenter__c',
    'FROM Order',
    "WHERE CreatedBy.Name LIKE '%noe%'",
    'AND QuoteId = null',
    "AND RecordType.Name = 'Pedido de Venta'",
    "AND Status != 'Draft'",
    'ORDER BY CreatedDate DESC LIMIT 1',
  ].join(' ');

  const recs = await sf.query(soql);
  console.log(JSON.stringify(recs, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
