import pactum from 'pactum';
import { updateRecord } from '../salesforce-crud.helper';

export async function createQuote(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Quote/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id') as string;

  // Salesforce trigger resets Activity__c + Actividad_LN__c on Quote insert.
  // PATCH only Activity__c here — Quote.Actividad_LN__c has a dependent restricted picklist
  // that rejects most values via API. Actividad_LN__c is set directly on the Order after
  // the Quote→Order trigger fires (see activity-coverage.spec.ts step 5b).
  const activity = payload['Activity__c'] as string | undefined;
  if (activity) {
    await pactum.spec()
      .patch(`/sobjects/Quote/${id}`)
      .withBody({ Activity__c: activity })
      .expectStatus(204);
  }

  return id;
}

export async function getQuote(id: string): Promise<Record<string, unknown>> {
  const quote = await pactum.spec()
    .get(`/sobjects/Quote/${id}`)
    .expectStatus(200)
    .returns('.');
  return quote as Record<string, unknown>;
}

export async function createQuoteLineItem(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/QuoteLineItem/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function updateQuoteStatus(id: string, status: string): Promise<void> {
  await updateRecord('Quote', id, { Status: status });
}
