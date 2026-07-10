import pactum from 'pactum';

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
