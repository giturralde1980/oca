import pactum from 'pactum';

export async function createContact(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Contact/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function getContact(id: string): Promise<Record<string, unknown>> {
  const contact = await pactum.spec()
    .get(`/sobjects/Contact/${id}`)
    .expectStatus(200)
    .returns('.');
  return contact as Record<string, unknown>;
}

// Polls until SAP sync is confirmed: SynchronizationError__c empty, ContactNumber__c populated
// (mirrors verifyAccountLinkedToSAP's HasSyncError__c/AccountNumber pattern for Account).
export async function verifyContactLinkedToSAP(
  id: string,
  { initialDelayMs = 0, intervalMs = 3000, timeoutMs = 30000 }: { initialDelayMs?: number; intervalMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  if (initialDelayMs > 0) await new Promise(r => setTimeout(r, initialDelayMs));

  const start    = Date.now();
  const deadline = start + timeoutMs;
  let attempts   = 0;

  while (Date.now() < deadline) {
    attempts++;
    const contact = await getContact(id);

    const syncError     = contact['SynchronizationError__c'];
    const contactNumber = contact['ContactNumber__c'];

    console.log(`[SAP sync Contact] attempt ${attempts} — ContactNumber__c: ${contactNumber}, SynchronizationError__c: ${syncError}`);

    if (syncError) {
      throw new Error(`SAP sync error on contact ${id}: ${syncError}`);
    }

    if (contactNumber) {
      console.log(`[SAP sync Contact] confirmed after ${attempts} attempt(s) in ${((Date.now() - start) / 1000).toFixed(1)}s (+ ${initialDelayMs / 1000}s initial wait)`);
      return;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Contact ${id} SAP sync did not complete within ${timeoutMs}ms`);
}
