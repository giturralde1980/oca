import { faker } from '@faker-js/faker';
import { getTestData } from '../../config/testdata';

interface AssetTestData {
  ASSET_RECORD_TYPES: { CENTER: string; INTERNATIONAL_CENTER: string; INSTALLATION: string; EQUIPMENT: string };
  CENTER_ADDRESS_REFS: { COUNTRY__C: string; REGION__C: string; PROVINCE__C: string };
}

const data = getTestData<AssetTestData>('asset');

export const ASSET_RECORD_TYPES = data.ASSET_RECORD_TYPES;

// Country__c → Region__c → Province__c is a dependent-lookup chain into AddressDatabase__c.
// Center/InternationalCenter reject creation without a consistent triplet
// (FIELD_CUSTOM_VALIDATION_EXCEPTION: "'province' field is mandatory..."). Values below are
// reference/master data (Spain — Región de Ronda), reused the same way DELEGATIONS.DEFAULT is.
export const CENTER_ADDRESS_REFS = data.CENTER_ADDRESS_REFS;

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
