import { faker } from '@faker-js/faker';

export const ASSET_RECORD_TYPES = {
  CENTER:                '01209000000iw9YAAQ',
  INTERNATIONAL_CENTER:  '01209000000iz95AAA',
  INSTALLATION:          '01209000000iw9aAAA',
  EQUIPMENT:             '01209000000iw9ZAAQ',
};

// Country__c → Region__c → Province__c is a dependent-lookup chain into AddressDatabase__c.
// Center/InternationalCenter reject creation without a consistent triplet
// (FIELD_CUSTOM_VALIDATION_EXCEPTION: "'province' field is mandatory..."). Values below are
// reference/master data (Spain — Región de Ronda), reused the same way DELEGATIONS.DEFAULT is.
export const CENTER_ADDRESS_REFS = {
  COUNTRY__C:  'a0QJW000006hyof2AA',
  REGION__C:   'a0QJW000006hz6d2AA',
  PROVINCE__C: 'a0QJW000006hvPn2AI',
};

export interface AssetFixture {
  Name:         string;
  AccountId:    string;
  RecordTypeId: string;
  ParentId?:    string;
  [key: string]: unknown;
}

export function buildAsset(
  accountId:    string,
  recordTypeId: string,
  overrides:    Partial<AssetFixture> = {},
): AssetFixture {
  return {
    Name:         `${faker.commerce.productName()} — E2E`,
    AccountId:    accountId,
    RecordTypeId: recordTypeId,
    ...overrides,
  };
}
