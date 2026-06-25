import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function get<T>(path: string): Promise<T> {
  return await pactum.spec().get(path).expectStatus(200).returns('.') as T;
}

async function query<T>(soql: string): Promise<T[]> {
  const result = await pactum.spec().get('/query').withQueryParams('q', soql).expectStatus(200).returns('.') as Record<string, unknown>;
  return (result['records'] as T[]) ?? [];
}

const SKIP = new Set(['attributes', 'Id', 'CreatedDate', 'LastModifiedDate', 'SystemModstamp',
  'LastViewedDate', 'LastReferencedDate', 'CreatedById', 'LastModifiedById']);

function print(label: string, obj: Record<string, unknown>) {
  console.log(`\n${'═'.repeat(60)}\n${label}\n${'═'.repeat(60)}`);
  for (const [k, v] of Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) {
    if (!SKIP.has(k) && v !== null) console.log(`  ${k}: ${JSON.stringify(v)}`);
  }
}

async function main() {
  await setupPactum();

  // Find a 6100 Order that came from a Quote
  const found = await query<Record<string, unknown>>(`
    SELECT Id, OrderNumber, QuoteId, OpportunityId, SAPOrderNumber__c, TotalAmount
    FROM Order
    WHERE Activity__c = '6100'
      AND SAPOrderNumber__c != null
      AND QuoteId != null
    ORDER BY CreatedDate DESC
    LIMIT 1
  `);
  if (!found.length) { console.error('No 6100 order with QuoteId found'); return; }
  console.log(`Using Order ${found[0]['OrderNumber']} (SAP# ${found[0]['SAPOrderNumber__c']})`);
  const order = await get<Record<string, unknown>>(`/sobjects/Order/${found[0]['Id']}`);
  print('ORDER (6100)', order);

  const quoteId = order['QuoteId'] as string;
  const oppId   = order['OpportunityId'] as string;

  if (quoteId) {
    const quote = await get<Record<string, unknown>>(`/sobjects/Quote/${quoteId}`);
    print('QUOTE', quote);

    const qlis = await query<Record<string, unknown>>(`
      SELECT Id, QuoteId, PricebookEntryId, Quantity, UnitPrice, SelectedPrice__c,
             Subtotal__c, Taxes__c, TaxesTotal__c, Fee__c, Discount__c,
             Activity__c, Subactivity__c, Actividad_LN__c,
             Holder__c, Asset__c, RelatedContract__c, Bypass_Apex__c
      FROM QuoteLineItem WHERE QuoteId = '${quoteId}'
    `);
    console.log(`\n${'═'.repeat(60)}\nQUOTE LINE ITEMS (${qlis.length})\n${'═'.repeat(60)}`);
    qlis.forEach((li, i) => {
      console.log(`\n  --- QLI ${i + 1} ---`);
      for (const [k, v] of Object.entries(li).sort(([a], [b]) => a.localeCompare(b))) {
        if (!SKIP.has(k) && k !== 'attributes') console.log(`    ${k}: ${JSON.stringify(v)}`);
      }
    });
  }

  if (oppId) {
    const opp = await get<Record<string, unknown>>(`/sobjects/Opportunity/${oppId}`);
    print('OPPORTUNITY', opp);
  }
}

main().catch(console.error);
