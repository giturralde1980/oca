import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import { getAccount } from './src/helpers/steps/account.steps';

async function main() {
  await setupPactum();
  const account = await getAccount('08pJW000002DAEvYAO');
  console.log(JSON.stringify(account, null, 2));
}

main().catch(console.error);
