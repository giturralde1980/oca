import { setupPactum } from '../../helpers/request.helper';
import { createAccount, verifyAccountLinkedToSAP } from '../../helpers/steps/account.steps';
import { buildAccount } from '../../helpers/fixtures/account.fixture';

const TEST_ACCOUNT = buildAccount();

describe('E2E — Account creation + SAP sync', () => {
  beforeAll(async () => {
    await setupPactum();
  });

  let accountId: string;

  it('step 1 — should create an Account', async () => {
    accountId = await createAccount(TEST_ACCOUNT);
    console.log('[account] created:', accountId);
    expect(accountId).toBeTruthy();
  }, 60000);

  it('step 2 — should verify Account is synced to SAP', async () => {
    await verifyAccountLinkedToSAP(accountId, { initialDelayMs: 25000, intervalMs: 10000, timeoutMs: 75000 });
  }, 105000);

  // No cleanup — deleting the account in SF leaves an orphan record in SAP
  // afterAll(async () => {
  //   if (accountId) await deleteAccount(accountId).catch(() => {});
  // });
});
