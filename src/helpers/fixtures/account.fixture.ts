import { faker } from '@faker-js/faker';
import { generateCIF } from './lead.fixture';
import { getTestData } from '../../config/testdata';

interface AccountTestData {
  ACCOUNT_RECORD_TYPES: { BUSINESS: string; EXPLOTACION: string; DELEGACION: string; PROVEEDOR: string };
  DELEGATIONS: { DEFAULT: string };
  DIVISION_DEFAULT: string;
  SOCIETY_DEFAULT: string;
}

const data = getTestData<AccountTestData>('account');

export const ACCOUNT_RECORD_TYPES = data.ACCOUNT_RECORD_TYPES;
export const DELEGATIONS = data.DELEGATIONS;

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
  // Suffix with a random token — Salesforce's Account_Name duplicate rule rejects an
  // insert outright (400 DUPLICATES_DETECTED) when faker.company.name() repeats a prior run.
  const name    = `${faker.company.name()} ${faker.string.alphanumeric(6).toUpperCase()}`;
  const address = faker.helpers.arrayElement(REAL_ADDRESSES);

  return {
    Name:                    name,
    SocialReason__c:         name,
    CIF__c:                  generateCIF(),
    RecordTypeId:            ACCOUNT_RECORD_TYPES.BUSINESS,
    Delegation__c:           DELEGATIONS.DEFAULT,
    Division__c:             data.DIVISION_DEFAULT,
    Society__c:              data.SOCIETY_DEFAULT,
    AccountSource:           'Email',
    InvoiceMail__c:          `${faker.string.alphanumeric(10).toLowerCase()}@qa-automation.com`,
    EqualToContactAddres__c: true,
    Phone:                   `6${faker.string.numeric(8)}`,
    ...address,
    ...overrides,
  };
}
