import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function get(path: string): Promise<Record<string, unknown>> {
  return await pactum.spec().get(path).expectStatus(200).returns('.') as Record<string, unknown>;
}


function diff(label: string, good: Record<string, unknown>, bad: Record<string, unknown>) {
  const allKeys = new Set([...Object.keys(good), ...Object.keys(bad)]);
  const diffs: string[] = [];
  for (const key of [...allKeys].sort()) {
    if (['attributes','Id','CreatedDate','LastModifiedDate','SystemModstamp','LastViewedDate','LastReferencedDate',
         'CreatedById','LastModifiedById','OwnerId','Owner_Text__c','Id_David_Pedido__c'].includes(key)) continue;
    if (JSON.stringify(good[key]) !== JSON.stringify(bad[key])) {
      diffs.push(`  ${key}:\n    REF: ${JSON.stringify(good[key])}\n    NEW: ${JSON.stringify(bad[key])}`);
    }
  }
  console.log(`\n${'='.repeat(60)}\n${label}\n${'='.repeat(60)}`);
  if (diffs.length === 0) console.log('  (no relevant differences)');
  else console.log(diffs.join('\n'));
}

async function getOrder(id: string): Promise<Record<string, unknown>> {
  return await pactum.spec().get(`/sobjects/Order/${id}`).expectStatus(200).returns('.') as Record<string, unknown>;
}

async function main() {
  await setupPactum();

  // Orders
  const orderGood = await getOrder('801JW00001JuoTLYAZ');
  const orderBad  = await getOrder('801JW00001Jw3PrYAJ');
  diff('ORDER', orderGood, orderBad);

  // Quotes
  const quoteGood = await get('/sobjects/Quote/0Q0JW000008Hx2H0AS');
  const quoteBad  = await get('/sobjects/Quote/0Q0JW000008I65a0AC');
  diff('QUOTE', quoteGood, quoteBad);

  // QuoteLineItems
  const qliGood = await get('/sobjects/QuoteLineItem/0QLJW00000CVO7B4AX');
  const qliBad  = await get('/sobjects/QuoteLineItem/0QLJW00000CVZKM4A5');
  diff('QUOTE LINE ITEM', qliGood, qliBad);

  // Opportunities
  const oppGood = await get('/sobjects/Opportunity/006JW00000g1Bu7YAE');
  const oppBad  = await get('/sobjects/Opportunity/006JW00000g1gTIYAY');
  diff('OPPORTUNITY', oppGood, oppBad);
}

main().catch(console.error);
