import pactum from 'pactum';
import { setupPactum } from '../../helpers/request.helper';
import { newAccount, updatedAccount } from '../../fixtures/accounts.fixture';

describe('Accounts API', () => {
  let accountId: string;

  beforeAll(async () => {
    await setupPactum();
  });

  it('should create an account', async () => {
    const response = await pactum.spec()
      .post('/sobjects/Account')
      .withBody(newAccount)
      .expectStatus(201)
      .returns('id');

    accountId = response as string;
    expect(accountId).toBeDefined();
  });

  it('should get the sync created account', async () => {
    await pactum.spec()
      .get(`/sobjects/Account/${accountId}`)
      .expectStatus(200)
      .expectJsonLike({ Name: newAccount.Name });
  });

  it('should update the account', async () => {
    await pactum.spec()
      .patch(`/sobjects/Account/${accountId}`)
      .withBody(updatedAccount)
      .expectStatus(204);
  });

  it('should delete the account', async () => {
    await pactum.spec()
      .delete(`/sobjects/Account/${accountId}`)
      .expectStatus(204);
  });
});
