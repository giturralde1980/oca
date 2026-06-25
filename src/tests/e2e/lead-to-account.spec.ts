import { setupPactum } from '../../helpers/request.helper';
import { createLead, getLead, convertLead } from '../../helpers/steps/lead.steps';
import { getAccount, updateAccount, verifyAccountLinkedToSAP } from '../../helpers/steps/account.steps';
import { buildLead, generateCIF } from '../../helpers/fixtures/lead.fixture';

// E2E: Lead creation → conversion to Account → SAP linkage verification
//
// Steps (manual flow observed in demo → mapped to API calls):
//   1. Create Lead with required fields
//   2. Convert Lead → generates Account + Contact
//   3. Verify Account exists and is linked to SAP
//
// Cleanup: Lead is deleted after test to avoid polluting QA data.
// Account/Contact created on conversion are left as SF would normally create them.

const TEST_LEAD = buildLead();

describe('E2E — Lead to Account (SAP linkage)', () => {
  beforeAll(async () => {
    await setupPactum();
  });

  let leadId: string;
  let accountId: string;

  it('step 1 — should create a Lead', async () => {
    leadId = await createLead(TEST_LEAD);
    expect(leadId).toBeTruthy();
  }, 60000);

  it('step 2 — should verify Lead exists in SF', async () => {
    const lead = await getLead(leadId);
    expect(lead['IsConverted']).toBe(false);
    expect(lead['LastName']).toBe(TEST_LEAD.LastName);
  });

  it('step 3 — should convert Lead to Account + Contact', async () => {
    // TODO: implement convertLead step once mechanism is confirmed in demo
    const result = await convertLead(leadId);
    accountId = result.accountId;
    expect(accountId).toBeTruthy();
    expect(result.contactId).toBeTruthy();
  });

  it('step 3.5 — should set SAP-required fields on the Account', async () => {
    const account = await getAccount(accountId);
    const name = account['Name'] as string;
    await updateAccount(accountId, {
      Name:                    name,
      SocialReason__c:         name,
      CIF__c:                  generateCIF(),
      Society__c:              '1200',
      InvoiceMail__c:          TEST_LEAD.Email,
      EqualToContactAddres__c: true,
      AccountSource:           'Email',
    });
  });

  it('step 4 — should verify Account was created', async () => {
    const account = await getAccount(accountId);
    expect(account['Id']).toBe(accountId);
    expect(account['Name']).toBeTruthy();
  });

  it('step 5 — should verify Account is linked to SAP', async () => {
    // TODO: confirm SAP linkage field name after demo
    await verifyAccountLinkedToSAP(accountId);
  });

  // No cleanup — converted leads cannot be deleted, and deleting mid-flow could corrupt the conversion
  // afterAll(async () => {
  //   if (leadId) await deleteLead(leadId).catch(() => {});
  // });
});
