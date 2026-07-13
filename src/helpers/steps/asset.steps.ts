import pactum from 'pactum';
import { sfQuery } from '../salesforce-query.helper';

export async function createAsset(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Asset/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function getAsset(id: string): Promise<Record<string, unknown>> {
  const asset = await pactum.spec()
    .get(`/sobjects/Asset/${id}`)
    .expectStatus(200)
    .returns('.');
  return asset as Record<string, unknown>;
}

// EquipmentCVM__c only strictly requires Equipment__c (lookup to the parent Asset).
export async function createEquipmentCvm(assetId: string, overrides: Record<string, unknown> = {}): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/EquipmentCVM__c/')
    .withBody({ Equipment__c: assetId, ...overrides })
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

// Installation_parameters__c relates to Asset__c only (no FK to Order/OrderItem) — a "paquete"
// product expands into one row per constituent parameter, matched by ProductCode__c prefix.
export async function queryInstallationParameters(assetId: string): Promise<{ Id: string; ProductCode__c: string }[]> {
  return sfQuery.query<{ Id: string; ProductCode__c: string }>(
    `SELECT Id, ProductCode__c FROM Installation_parameters__c WHERE Asset__c = '${assetId}'`,
  );
}

/** Polls until at least minCount Installation_parameters__c rows exist for the asset. */
export async function waitForInstallationParameters(
  assetId: string,
  minCount = 1,
  { maxAttempts = 8, delayMs = 10000 }: { maxAttempts?: number; delayMs?: number } = {},
): Promise<{ Id: string; ProductCode__c: string }[]> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rows = await queryInstallationParameters(assetId);
    if (rows.length >= minCount) return rows;
    console.log(`[installation-parameters] esperar — intento ${attempt}/${maxAttempts}, encontrados: ${rows.length}`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`Installation_parameters__c not found for Asset ${assetId} after polling`);
}
