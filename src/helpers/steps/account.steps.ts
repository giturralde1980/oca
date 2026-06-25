import pactum from 'pactum';

export async function createAccount(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Account/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function updateAccount(id: string, payload: Record<string, unknown>): Promise<void> {
  await pactum.spec()
    .patch(`/sobjects/Account/${id}`)
    .withBody(payload)
    .expectStatus(204);
}

export async function getAccount(id: string): Promise<Record<string, unknown>> {
  const account = await pactum.spec()
    .get(`/sobjects/Account/${id}`)
    .expectStatus(200)
    .returns('.');
  return account as Record<string, unknown>;
}

export async function deleteAccount(id: string): Promise<void> {
  await pactum.spec()
    .delete(`/sobjects/Account/${id}`)
    .expectStatus(204);
}

// Polls until SAP sync is confirmed: HasSyncError__c=false, AccountNumber populated, SynchronizationError__c empty
export async function verifyAccountLinkedToSAP(
  id: string,
  { initialDelayMs = 0, intervalMs = 3000, timeoutMs = 30000 }: { initialDelayMs?: number; intervalMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  if (initialDelayMs > 0) await new Promise(r => setTimeout(r, initialDelayMs));

  const start    = Date.now();
  const deadline = start + timeoutMs;
  let attempts   = 0;

  while (Date.now() < deadline) {
    attempts++;
    const account = await getAccount(id);

    const syncError    = account['SynchronizationError__c'];
    const hasError     = account['HasSyncError__c'];
    const accountNumber = account['AccountNumber'];

    console.log(`[SAP sync] attempt ${attempts} — HasSyncError__c: ${hasError}, AccountNumber: ${accountNumber}`);

    if (syncError) {
      throw new Error(`SAP sync error on account ${id}: ${syncError}`);
    }

    if (hasError === false && accountNumber) {
      console.log(`[SAP sync] confirmed after ${attempts} attempt(s) in ${((Date.now() - start) / 1000).toFixed(1)}s (+ ${initialDelayMs / 1000}s initial wait)`);
      return;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Account ${id} SAP sync did not complete within ${timeoutMs}ms`);
}
