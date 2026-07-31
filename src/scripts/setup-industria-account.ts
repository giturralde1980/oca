/**
 * Crea, en el entorno indicado por TEST_ENV, una cuenta "clon" de TAIKA (misma configuración
 * de negocio, distinto nombre/CIF) junto con el Contacto, el Perfil de Facturación y los 6
 * Assets tipo Instalación que el flujo de Industria necesita — y vuelca los IDs resultantes a
 * testdata/<env>/industria-account.json, que industria-account.ts lee automáticamente.
 *
 * Uso: TEST_ENV=qa node -r dotenv/config node_modules/ts-node/dist/bin.js src/scripts/setup-industria-account.ts
 *  (o el script de npm: npm run setup:industria-account:qa / :uat / :int / :prd)
 *
 * Pensado para correrse una sola vez por entorno, típicamente justo después de un refresh de
 * sandbox — reemplaza la dependencia de una cuenta preexistente que no sobrevive al refresh.
 * Los valores de la receta (Delegation__c/Division__c de la cuenta, y los campos de negocio +
 * geografía de cada Asset) viven en testdata/<env>/steps.json → SETUP_INDUSTRIA_ACCOUNT, no acá
 * — son distintos por entorno (confirmado: qa y uat tienen Ids de geografía y Delegación
 * distintos aunque representen los mismos lugares reales).
 */
import pactum from 'pactum';
import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import { setupPactum } from '../helpers/request.helper';
import { buildAccount } from '../helpers/fixtures/account.fixture';
import { verifyAccountLinkedToSAP, deleteAccount } from '../helpers/steps/account.steps';
import { updateRecord } from '../helpers/salesforce-crud.helper';
import { getTestData } from '../config/testdata';

interface AssetRecipe {
  insert: Record<string, unknown>;
  post:   Record<string, unknown>;
}
interface SetupIndustriaAccountData {
  CONTACT_RECORD_TYPE:           string;
  ASSET_RECORD_TYPE_INSTALACION: string;
  COMMERCIAL_ID:                 string;
  DELEGATION_ID:                 string;
  ACCOUNT_DIVISION:              string;
  ASSET_RECIPES:                 AssetRecipe[];
}
interface StepsTestData {
  SETUP_INDUSTRIA_ACCOUNT: SetupIndustriaAccountData;
}

const ASSET_COUNT = 6;

interface Result {
  accountId: string;
  contactId: string;
  billingProfileId: string;
  assetIds: string[];
}

async function main() {
  await setupPactum();
  const recipe = getTestData<StepsTestData>('steps').SETUP_INDUSTRIA_ACCOUNT;

  // Division__c y Delegation__c copiados de TAIKA — el default de buildAccount() no es
  // compatible con el Society__c '7010' que usa el BillingProfile de Industria: SAP rechaza el
  // sync con un error de plausibilidad de área de ventas (oficina/grupo de vendedores no
  // previstos para esa combinación Division+Society).
  //
  // El CIF__c se genera al azar (generateCIF, en lead.fixture.ts) y a veces colisiona con un NIF
  // de deudor ya existente en SAP ("NIF deudor duplicado") — la cuenta queda creada pero nunca
  // sincroniza, y sin sincronizar no sirve para nada (no se puede ganar ninguna oferta contra
  // ella). Reintenta con un CIF nuevo cada vez que el sync falla, hasta que sincronice limpio.
  const MAX_ACCOUNT_ATTEMPTS = 5;
  let accountId = '';
  let account: ReturnType<typeof buildAccount> | undefined;

  for (let attempt = 1; attempt <= MAX_ACCOUNT_ATTEMPTS; attempt++) {
    account = buildAccount({
      Name:          `Industria Clon ${faker.string.alphanumeric(6).toUpperCase()}`,
      Division__c:   recipe.ACCOUNT_DIVISION,
      Delegation__c: recipe.DELEGATION_ID,
    });
    accountId = await pactum.spec()
      .post('/sobjects/Account/')
      .withBody(account)
      .expectStatus(201)
      .returns('id') as string;
    console.log(`Account creada (intento ${attempt}/${MAX_ACCOUNT_ATTEMPTS}):`, accountId, '-', account.Name);

    console.log('Esperando sincronización SAP de la cuenta...');
    try {
      await verifyAccountLinkedToSAP(accountId, { initialDelayMs: 15000, timeoutMs: 90000 });
      break;
    } catch (e) {
      const message = (e as Error).message;
      if (attempt === MAX_ACCOUNT_ATTEMPTS) throw e;
      console.log(`Sync falló (${message.slice(0, 200)}) — se descarta esta cuenta y se reintenta con un CIF nuevo.`);
      await deleteAccount(accountId).catch(() => {
        console.log('(no se pudo borrar la cuenta fallida — el usuario de API no tiene permiso de delete; queda huérfana, sin efecto en el resultado)');
      });
    }
  }

  const contactId = await pactum.spec()
    .post('/sobjects/Contact/')
    .withBody({
      AccountId:    accountId,
      LastName:     `Contacto ${faker.string.alphanumeric(6).toUpperCase()}`,
      RecordTypeId: recipe.CONTACT_RECORD_TYPE,
      Language__c:  'ES',
      Country__c:   'ES',
      Status__c:    'Activo',
      // Ganar la oferta también exige un email real — no el genérico sindatos@sindatos.com
      // que queda por defecto si no se manda ninguno.
      Email:        `${faker.string.alphanumeric(10).toLowerCase()}@qa-automation.com`,
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
    const { insert, post } = recipe.ASSET_RECIPES[i % recipe.ASSET_RECIPES.length];
    const assetId = await pactum.spec()
      .post('/sobjects/Asset/')
      .withBody({
        Name:           `Instalación Clon ${i}`,
        AccountId:      accountId,
        RecordTypeId:   recipe.ASSET_RECORD_TYPE_INSTALACION,
        Status:         'Active',
        CAERequired__c: 'No',
        Commercial__c:  recipe.COMMERCIAL_ID,
        ...insert,
      })
      .expectStatus(201)
      .returns('id') as string;
    // Update aparte: si fuera parte del insert, el trigger lo pisaría con null (ver nota en
    // NBK_AssetTriggerHelper.setAddressDatabaseFields, documentada en industria-quote.steps.ts).
    await updateRecord('Asset', assetId, post);
    assetIds.push(assetId);
    console.log(`Asset ${i}/${ASSET_COUNT} creado:`, assetId);
  }

  const result: Result = { accountId, contactId, billingProfileId, assetIds };
  const env = process.env.TEST_ENV || 'qa';
  const outPath = path.join(__dirname, '..', '..', 'testdata', env, 'industria-account.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('\nGuardado en', outPath);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
