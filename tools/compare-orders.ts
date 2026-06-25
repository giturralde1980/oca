import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function getOrder(id: string): Promise<Record<string, unknown>> {
  return await pactum.spec().get(`/sobjects/Order/${id}`).expectStatus(200).returns('.') as Record<string, unknown>;
}

async function main() {
  await setupPactum();
  const [good, bad] = await Promise.all([
    getOrder('801JW00001JuoTLYAZ'),
    getOrder('801JW00001JwIO4YAN'),
  ]);

  const allKeys = new Set([...Object.keys(good), ...Object.keys(bad)]);
  console.log('=== DIFF (reference vs new) ===\n');
  for (const key of [...allKeys].sort()) {
    if (JSON.stringify(good[key]) !== JSON.stringify(bad[key])) {
      console.log(`${key}:`);
      console.log(`  REF: ${JSON.stringify(good[key])}`);
      console.log(`  NEW: ${JSON.stringify(bad[key])}`);
    }
  }
}

main().catch(console.error);
