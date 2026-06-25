import pactum from 'pactum';

export async function updateRecord(
  object: string,
  id: string,
  fields: Record<string, unknown>,
  timeoutMs = 30000,
): Promise<void> {
  await pactum.spec()
    .patch(`/sobjects/${object}/${id}`)
    .withBody(fields)
    .withRequestTimeout(timeoutMs)
    .expectStatus(204);
}
