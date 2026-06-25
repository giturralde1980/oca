import { faker } from '@faker-js/faker';
import { generateCIF } from './lead.fixture';

export const ACCOUNT_RECORD_TYPES = {
  BUSINESS: '01209000000ivaNAAQ',
};

export const DELEGATIONS = {
  DEFAULT: '001JW00000sULUXYA4',
};

const REAL_ADDRESSES = [
  { BillingStreet: 'Calle Gran Vía 28',               BillingCity: 'Madrid',    BillingState: 'Madrid',    BillingPostalCode: '28013', BillingCountry: 'Spain' },
  { BillingStreet: 'Carrer del Cisell 15',             BillingCity: 'Barcelona', BillingState: 'Barcelona', BillingPostalCode: '08038', BillingCountry: 'Spain' },
  { BillingStreet: 'Avenida de la Constitución 1',     BillingCity: 'Sevilla',   BillingState: 'Sevilla',   BillingPostalCode: '41004', BillingCountry: 'Spain' },
  { BillingStreet: 'Miguel González Garcés 59',        BillingCity: 'A Coruña',  BillingState: 'A Coruña',  BillingPostalCode: '15174', BillingCountry: 'Spain' },
  { BillingStreet: 'Miguel González Garcés 71',        BillingCity: 'A Coruña',  BillingState: 'A Coruña',  BillingPostalCode: '15174', BillingCountry: 'Spain' },
];

export interface AccountFixture {
  Name: string;
  SocialReason__c: string;
  CIF__c: string;
  RecordTypeId: string;
  Delegation__c: string;
  Division__c: string;
  Society__c: string;
  AccountSource: string;
  InvoiceMail__c: string;
  EqualToContactAddres__c: boolean;
  Phone: string;
  BillingStreet: string;
  BillingCity: string;
  BillingState: string;
  BillingPostalCode: string;
  BillingCountry: string;
  [key: string]: unknown;
}

export function buildAccount(overrides: Partial<AccountFixture> = {}): AccountFixture {
  const name    = faker.company.name();
  const address = faker.helpers.arrayElement(REAL_ADDRESSES);

  return {
    Name:                    name,
    SocialReason__c:         name,
    CIF__c:                  generateCIF(),
    RecordTypeId:            ACCOUNT_RECORD_TYPES.BUSINESS,
    Delegation__c:           DELEGATIONS.DEFAULT,
    Division__c:             'PE - Servicios Técnicos',
    Society__c:              '1200',
    AccountSource:           'Email',
    InvoiceMail__c:          faker.internet.email({ provider: 'qa-automation.com' }),
    EqualToContactAddres__c: true,
    Phone:                   `6${faker.string.numeric(8)}`,
    ...address,
    ...overrides,
  };
}
