import pactum from 'pactum';

export async function createBillingProfile(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/BillingProfile__c/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function getBillingProfile(id: string): Promise<Record<string, unknown>> {
  const bp = await pactum.spec()
    .get(`/sobjects/BillingProfile__c/${id}`)
    .expectStatus(200)
    .returns('.');
  return bp as Record<string, unknown>;
}
