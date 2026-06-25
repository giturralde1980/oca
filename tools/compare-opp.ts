import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function main() {
  await setupPactum();
  const good = await pactum.spec().get('/sobjects/Opportunity/006JW00000g1Bu7YAE').expectStatus(200).returns('.') as Record<string, unknown>;
  const bad  = await pactum.spec().get('/sobjects/Opportunity/006JW00000g1qlyYAA').expectStatus(200).returns('.') as Record<string, unknown>;

  const skip = new Set(['attributes','Id','CreatedDate','LastModifiedDate','SystemModstamp','LastViewedDate','LastReferencedDate','CreatedById','LastModifiedById','OwnerId']);
  const allKeys = [...new Set([...Object.keys(good), ...Object.keys(bad)])].sort();

  console.log('\n=== ALL FIELDS (GOOD | BAD) ===\n');
  for (const k of allKeys) {
    if (skip.has(k)) continue;
    const g = JSON.stringify(good[k]);
    const b = JSON.stringify(bad[k]);
    const marker = g !== b ? '  <<' : '';
    console.log(`${k}: ${g} | ${b}${marker}`);
  }
}
main().catch(console.error);
