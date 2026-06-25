import 'dotenv/config';
import { setupPactum } from './src/helpers/request.helper';
import pactum from 'pactum';

async function main() {
  await setupPactum();

  const oppId = '006JW00000g1qlyYAA';

  console.log('Patching Activity__c and Actividad_LN__c...');
  await pactum.spec()
    .patch(`/sobjects/Opportunity/${oppId}`)
    .withJson({ Activity__c: '2410', Actividad_LN__c: '2410' })
    .expectStatus(204);

  console.log('PATCH 204 OK — fetching to verify...');
  const opp = await pactum.spec()
    .get(`/sobjects/Opportunity/${oppId}`)
    .expectStatus(200)
    .returns('.') as Record<string, unknown>;

  console.log('Activity__c:', opp['Activity__c']);
  console.log('Actividad_LN__c:', opp['Actividad_LN__c']);
  console.log('ProfitCenter__c:', opp['ProfitCenter__c'] ?? '(no field on Opp)');
}
main().catch(console.error);
