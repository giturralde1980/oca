import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import { getAccount } from './src/helpers/steps/account.steps';

const QUALITY_SA  = '001JW00001JXZbXYAX';
const FAILING     = '001JW00001JYD7dYAH';

async function main() {
  await setupPactum();
  const [good, bad] = await Promise.all([getAccount(QUALITY_SA), getAccount(FAILING)]);

  const allKeys = new Set([...Object.keys(good), ...Object.keys(bad)]);

  console.log('\n=== DIFF (Quality SA vs Ebert-Maggio) ===\n');
  for (const key of [...allKeys].sort()) {
    const g = good[key];
    const b = bad[key];
    if (JSON.stringify(g) !== JSON.stringify(b)) {
      console.log(`${key}:`);
      console.log(`  ✓ Quality SA : ${JSON.stringify(g)}`);
      console.log(`  ✗ Failing    : ${JSON.stringify(b)}`);
    }
  }
}

main().catch(console.error);
