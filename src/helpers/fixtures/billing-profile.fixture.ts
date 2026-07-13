import { faker } from '@faker-js/faker';

// PaymentConditions__c/PaymentMethod__c/TaxType__c are restricted picklists — values below
// mirror a real synced BillingProfile__c record (P030/A/ZMWS-3 confirmed valid together).
export interface BillingProfileFixture {
  Account__c:                   string;
  Contact__c?:                  string;
  Society__c:                   string;
  BankId__c:                    string;
  Email_Invoice_management__c:  string;
  First_paymentday__c:          number;
  Second_paymentday__c:         number;
  Third_paymentday__c:          number;
  PaymentConditions__c:         string;
  PaymentMethod__c:             string;
  TaxType__c:                   string;
  [key: string]: unknown;
}

export function buildBillingProfile(
  accountId: string,
  contactId?: string,
  overrides: Partial<BillingProfileFixture> = {},
): BillingProfileFixture {
  return {
    Account__c:                  accountId,
    Contact__c:                  contactId,
    Society__c:                  '1200',
    BankId__c:                   'LCX01_ICP',
    Email_Invoice_management__c: `${faker.string.alphanumeric(10).toLowerCase()}@qa-automation.com`,
    First_paymentday__c:         10,
    Second_paymentday__c:        20,
    Third_paymentday__c:         30,
    PaymentConditions__c:        'P030',
    PaymentMethod__c:            'A',
    TaxType__c:                  'ZMWS-3',
    ...overrides,
  };
}
