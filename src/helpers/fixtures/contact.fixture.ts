import { faker } from '@faker-js/faker';

export interface ContactFixture {
  LastName:   string;
  FirstName?: string;
  AccountId:  string;
  Email?:     string;
  Phone?:     string;
  [key: string]: unknown;
}

export function buildContact(accountId: string, overrides: Partial<ContactFixture> = {}): ContactFixture {
  return {
    // Random-alphanumeric local part avoids collisions when faker.internet.email()
    // regenerates the same firstName.lastName pair across runs.
    LastName:  faker.person.lastName(),
    FirstName: faker.person.firstName(),
    AccountId: accountId,
    Email:     `${faker.string.alphanumeric(10).toLowerCase()}@qa-automation.com`,
    Phone:     `6${faker.string.numeric(8)}`,
    ...overrides,
  };
}
