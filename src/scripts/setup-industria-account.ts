/**
 * Crea, en el entorno indicado por TEST_ENV, una cuenta "clon" de TAIKA (misma configuración
 * de negocio, distinto nombre/CIF) junto con el Contacto, el Perfil de Facturación y los 6
 * Assets tipo Instalación que el flujo de Industria necesita — y vuelca los IDs resultantes a
 * src/config/industria-account.generated.<env>.json, que industria-quote.steps.ts y los
 * fixtures de Industria leen automáticamente (con fallback a TAIKA si este archivo no existe).
 *
 * Uso: TEST_ENV=qa node -r dotenv/config node_modules/ts-node/dist/bin.js src/scripts/setup-industria-account.ts
 *  (o el script de npm: npm run setup:industria-account -- --env=qa)
 *
 * Pensado para correrse una sola vez por entorno, típicamente justo después de un refresh de
 * sandbox — reemplaza la dependencia de una cuenta preexistente que no sobrevive al refresh.
 */
import pactum from 'pactum';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import { setupPactum } from '../helpers/request.helper';
import { buildAccount } from '../helpers/fixtures/account.fixture';
import { generateCIF } from '../helpers/fixtures/lead.fixture';

const CONTACT_RECORD_TYPE = '01209000000iyAnAAI';

// Recetas de dirección reales, tomadas de los 6 Assets Instalación que hoy usa TAIKA —
// City__c/Country__c/Province__c son lookups a datos maestros de geografía (org-wide, no
// pertenecen a ninguna cuenta en particular), por eso son seguros de reutilizar para una
// cuenta nueva.
const ASSET_ADDRESS_RECIPES = [
  { Address__c: 'Centro de Instalación 1', City__c: 'a0QJW000006iNBw2AM', PostalCode__c: '1012', Country__c: 'a0QJW000006hyof2AA', Province__c: 'a0QJW000006hvPi2AI' },
  { Address__c: 'Centro de Instalación 2', City__c: 'a0QJW000007pvMo2AI', PostalCode__c: '31251', Country__c: 'a0QJW000006hyof2AA', Province__c: 'a0QJW000007preB2AQ' },
];

const ASSET_RECORD_TYPE_INSTALACION = '01209000000iw9aAAA';
const ASSET_COUNT = 6;

interface Result {
  accountId: string;
  contactId: string;
  billingProfileId: string;
  assetIds: string[];
}

async function main() {
  await setupPactum();

  const account = buildAccount({
    Name: `Industria Clon ${faker.string.alphanumeric(6).toUpperCase()}`,
  });
  const accountId = await pactum.spec()
    .post('/sobjects/Account/')
    .withBody(account)
    .expectStatus(201)
    .returns('id') as string;
  console.log('Account creada:', accountId, '-', account.Name);

  const contactId = await pactum.spec()
    .post('/sobjects/Contact/')
    .withBody({
      AccountId:    accountId,
      LastName:     `Contacto ${faker.string.alphanumeric(6).toUpperCase()}`,
      RecordTypeId: CONTACT_RECORD_TYPE,
      Language__c:  'ES',
      Country__c:   'ES',
      Status__c:    'Activo',
    })
    .expectStatus(201)
    .returns('id') as string;
  console.log('Contact creado:', contactId);

  const billingProfileId = await pactum.spec()
    .post('/sobjects/BillingProfile__c/')
    .withBody({
      Account__c:           accountId,
      Contact__c:           contactId,
      Society__c:           '7010',
      PaymentConditions__c: 'P005',
      PaymentMethod__c:     'A',
      BankId__c:            'LCX02_IR',
      IsPrincipal__c:       true,
    })
    .expectStatus(201)
    .returns('id') as string;
  console.log('BillingProfile creado:', billingProfileId);

  const assetIds: string[] = [];
  for (let i = 1; i <= ASSET_COUNT; i++) {
    const recipe = ASSET_ADDRESS_RECIPES[i % ASSET_ADDRESS_RECIPES.length];
    const assetId = await pactum.spec()
      .post('/sobjects/Asset/')
      .withBody({
        Name:            `Instalación Clon ${i}`,
        AccountId:       accountId,
        RecordTypeId:    ASSET_RECORD_TYPE_INSTALACION,
        Status:          'Active',
        CAERequired__c:  'No',
        ...recipe,
      })
      .expectStatus(201)
      .returns('id') as string;
    assetIds.push(assetId);
    console.log(`Asset ${i}/${ASSET_COUNT} creado:`, assetId);
  }

  const result: Result = { accountId, contactId, billingProfileId, assetIds };
  const env = process.env.TEST_ENV || 'qa';
  const outPath = path.join(__dirname, '..', 'config', `industria-account.generated.${env}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('\nGuardado en', outPath);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
