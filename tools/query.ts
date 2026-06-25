import 'dotenv/config';
import pactum from 'pactum';
import { setupPactum } from './src/helpers/request.helper';

const [,, soql] = process.argv;

async function main() {
  await setupPactum();
  const result = await pactum.spec()
    .get(`/query`)
    .withQueryParams('q', soql)
    .expectStatus(200)
    .returns('.');
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
