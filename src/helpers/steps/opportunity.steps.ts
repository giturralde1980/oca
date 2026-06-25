import pactum from 'pactum';

export async function createOpportunity(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Opportunity/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id') as string;

  const activity    = payload['Activity__c'] as string | undefined;
  const actividadLN = payload['Actividad_LN__c'] as string | undefined;
  if (activity) {
    const body: Record<string, unknown> = { Activity__c: activity };
    if (actividadLN) body['Actividad_LN__c'] = actividadLN;
    await pactum.spec()
      .patch(`/sobjects/Opportunity/${id}`)
      .withBody(body)
      .expectStatus(204);
  }

  return id;
}

export async function getOpportunity(id: string): Promise<Record<string, unknown>> {
  const opp = await pactum.spec()
    .get(`/sobjects/Opportunity/${id}`)
    .expectStatus(200)
    .returns('.');
  return opp as Record<string, unknown>;
}
