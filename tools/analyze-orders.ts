import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function query<T>(soql: string): Promise<T[]> {
  const result = await pactum.spec()
    .get('/query')
    .withQueryParams('q', soql)
    .expectStatus(200)
    .returns('.') as Record<string, unknown>;
  return (result['records'] as T[]) ?? [];
}

async function get<T>(path: string): Promise<T> {
  return await pactum.spec().get(path).expectStatus(200).returns('.') as T;
}

interface OrderRec {
  Id: string; OrderNumber: string;
  Activity__c: string | null; Actividad_LN__c: string | null;
  Section__c: string | null; Division__c: string | null; BusinessLine__c: string | null;
  SAPOrderNumber__c: string; TotalAmount: number | null; TaxBase__c: number | null;
  ProfitCenter__c: string | null; Status: string; CreatedDate: string;
  QuoteId: string | null; OpportunityId: string | null;
}

async function main() {
  await setupPactum();

  console.log('Querying last 50 Orders with SAPOrderNumber__c...\n');
  const orders = await query<OrderRec>(`
    SELECT Id, OrderNumber, Activity__c, Actividad_LN__c, Section__c, Division__c,
           BusinessLine__c, SAPOrderNumber__c, TotalAmount, TaxBase__c, ProfitCenter__c,
           Status, CreatedDate, QuoteId, OpportunityId
    FROM Order
    WHERE SAPOrderNumber__c != null
    ORDER BY CreatedDate DESC
    LIMIT 150
  `);

  console.log(`Found ${orders.length} synced Orders\n`);

  // Unique combos
  const byActivity = new Map<string, OrderRec>();
  for (const o of orders) {
    const key = `${o.Activity__c}|${o.Section__c}|${o.Division__c}|${o.BusinessLine__c}`;
    if (!byActivity.has(key)) byActivity.set(key, o);
  }

  console.log(`Unique combinations (Activity|Section|Division|BusinessLine): ${byActivity.size}\n`);

  // Deep dive per unique combo
  for (const [key, o] of [...byActivity.entries()].sort()) {
    console.log(`\n${'═'.repeat(72)}`);
    console.log(`COMBO: ${key}`);
    console.log(`Order ${o.OrderNumber} | SAP# ${o.SAPOrderNumber__c} | Amount ${o.TotalAmount} € | Status: ${o.Status}`);
    console.log(`ProfitCenter: ${o.ProfitCenter__c} | Created: ${o.CreatedDate.split('T')[0]}`);

    if (o.QuoteId) {
      const q = await get<Record<string, unknown>>(`/sobjects/Quote/${o.QuoteId}`);
      console.log(`\n  QUOTE: ${q['QuoteCode__c']} | Type: ${q['Type__c']} | Pricebook2Id: ${q['Pricebook2Id']}`);
      console.log(`  BillingType: ${q['BillingType__c']} | OrderType: ${q['OrderType__c']} | BillingFormat: ${q['BillingFormat__c']}`);
      console.log(`  Activity: ${q['Activity__c']} | Section: ${q['Section__c']} | BusinessLine: ${q['BusinessLine__c']} | Division: ${q['Division__c']}`);
      console.log(`  Society: ${q['Society__c']} | EntryChannel: ${q['EntryChannel__c']}`);

      const qlis = await query<Record<string, unknown>>(`
        SELECT Id, Quantity, UnitPrice, SelectedPrice__c, Subtotal__c, Taxes__c, TaxesTotal__c,
               Activity__c, Subactivity__c, Asset__c, PricebookEntryId
        FROM QuoteLineItem WHERE QuoteId = '${o.QuoteId}' LIMIT 5
      `);
      console.log(`\n  QUOTE LINE ITEMS (${qlis.length}):`);
      for (const li of qlis) {
        console.log(`    Qty:${li['Quantity']} UnitPrice:${li['UnitPrice']} Subtotal:${li['Subtotal__c']} Taxes:${li['Taxes__c']} TaxesTotal:${li['TaxesTotal__c']}`);
        console.log(`    Activity:${li['Activity__c']} Subactivity:${li['Subactivity__c']} PricebookEntry:${li['PricebookEntryId']}`);
      }
    }

    if (o.OpportunityId) {
      const opp = await get<Record<string, unknown>>(`/sobjects/Opportunity/${o.OpportunityId}`);
      console.log(`\n  OPPORTUNITY: ${opp['Name']} | Stage: ${opp['StageName']}`);
      console.log(`  Activity: ${opp['Activity__c']} | Division: ${opp['Division__c']} | BusinessLine: ${opp['BusinessLine__c']} | Section: ${opp['Section__c']}`);
      console.log(`  Society: ${opp['Society__c']} | RecordTypeId: ${opp['RecordTypeId']}`);
    }
  }

  // Final summary table
  console.log(`\n\n${'═'.repeat(72)}`);
  console.log('RESUMEN EJECUTIVO — Combinaciones únicas encontradas');
  console.log('═'.repeat(72));
  console.log(`${'Activity'.padEnd(8)} ${'Section'.padEnd(8)} ${'Division'.padEnd(10)} ${'BusinessLine'.padEnd(14)} ${'Orders'}`);
  console.log('─'.repeat(72));

  const summaryMap = new Map<string, number>();
  for (const o of orders) {
    const k = `${(o.Activity__c ?? 'null').padEnd(8)} ${(o.Section__c ?? 'null').padEnd(8)} ${(o.Division__c ?? 'null').padEnd(10)} ${(o.BusinessLine__c ?? 'null').padEnd(14)}`;
    summaryMap.set(k, (summaryMap.get(k) ?? 0) + 1);
  }
  for (const [k, count] of [...summaryMap.entries()].sort()) {
    console.log(`${k} ${count}`);
  }
}

main().catch(console.error);
