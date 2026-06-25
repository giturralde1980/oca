/**
 * Queries Salesforce directly to find valid record IDs for integration tests.
 *
 * Usage:
 *   node node_modules/.bin/ts-node src/scripts/find-test-data.ts [env]
 *
 * env defaults to 'qa'. Reads credentials from .env.<env>.
 *
 * NOTE: SOQL queries use estimated object/field names. If a query errors,
 * check the API name in Salesforce Setup → Object Manager and update the
 * corresponding method in salesforce-query.helper.ts.
 */

import dotenv from 'dotenv';
import path from 'path';

const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

// Imported AFTER dotenv so lazy getters read the loaded env vars
import { SalesforceQueryHelper } from '../helpers/salesforce-query.helper';

const sf = new SalesforceQueryHelper();

// ─────────────────────────────────────────────────────────────────────────────

interface Finder {
  envKey: string;
  fn: () => Promise<{ Id: string; [k: string]: unknown } | null>;
  extra?: (rec: { Id: string; [k: string]: unknown }) => string; // extra line to print
}

const finders: Finder[] = [
  {
    envKey: 'INBOUND_TEST_ACCOUNT_ID',
    fn: () => sf.findAccountWithErpData(),
    extra: (r) => `  → AccountNumber: ${r['AccountNumber']} | Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_CIF',
    fn: () => sf.findAccountCif(),
    extra: (r) => `  → NIF__c: ${r['NIF__c']} | Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PAYER_ACCOUNT_ID',
    fn: () => sf.findPayerAccount(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PROVIDER_ID',
    fn: () => sf.findProviderAccount(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_ORDER_PURCHASE_ID',
    fn: () => sf.findOrderPurchase(),
    extra: (r) => `  → OrderNumber: ${r['OrderNumber']}`,
  },
  {
    envKey: 'INBOUND_TEST_ORDER_SALES_ID',
    fn: () => sf.findOrderSales(),
    extra: (r) => `  → OrderNumber: ${r['OrderNumber']}`,
  },
  {
    envKey: 'INBOUND_TEST_INVOICE_SF_ID',
    fn: () => sf.findInvoice(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_DOCUMENT_ID',
    fn: () => sf.findDocument(),
    extra: (r) => `  → Title: ${r['Title']}`,
  },
  {
    envKey: 'INBOUND_TEST_EXPEDIENT_IDI_ID',
    fn: () => sf.findExpedientIdi(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PREVENGOS_EMPRESA_ID',
    fn: () => sf.findPrevengosEmpresa(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PREVENGOS_CONTRATO_ID',
    fn: () => sf.findPrevengosContrato(),
    extra: (r) => `  → ContractNumber: ${r['ContractNumber']}`,
  },
  {
    envKey: 'INBOUND_TEST_PREVENGOS_CONTACTO_ID',
    fn: () => sf.findPrevengosContacto(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PREVENGOS_CENTRO_ID',
    fn: () => sf.findPrevengosCentro(),
    extra: (r) => `  → Name: ${r['Name']}`,
  },
  {
    envKey: 'INBOUND_TEST_PREVENGOS_LINEA_CONTRATO_ID',
    fn: () => sf.findPrevengosLineaContrato(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nSearching for test data in Salesforce [${env.toUpperCase()}]...\n`);

  const found: Array<{ key: string; id: string }> = [];

  for (const { envKey, fn, extra } of finders) {
    try {
      const rec = await fn();
      if (rec) {
        found.push({ key: envKey, id: rec.Id });
        console.log(`  OK  ${envKey}=${rec.Id}`);
        if (extra) console.log(extra(rec));
      } else {
        console.log(`  --  ${envKey}: no records found`);
      }
    } catch (e: unknown) {
      console.log(`  ERR ${envKey}: ${(e as Error).message.split('\n')[0]}`);
    }
  }

  if (found.length === 0) {
    console.log('\nNo records found. Check credentials and SOQL queries.\n');
    return;
  }

  console.log('\n' + '─'.repeat(70));
  console.log(`  Copy/paste into .env.${env}:`);
  console.log('─'.repeat(70));
  for (const { key, id } of found) {
    console.log(`${key}=${id}`);
  }
  console.log('─'.repeat(70) + '\n');
}

main().catch((e) => {
  console.error('\nFatal error:', (e as Error).message);
  process.exit(1);
});
