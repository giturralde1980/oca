import { faker } from '@faker-js/faker';

export const OPP_REFS = {
  ACCOUNT_ID:    '001JW000007t8vWYAQ',
  RECORD_TYPE:   '012JW000000BzmcYAC',
  DELEGATION:    '001JW000007SxQ7YAK',
  CONTACT_ID:    '003JW000012ubJYYAY',
};

export interface OpportunityFixture {
  Name:           string;
  StageName:      string;
  CloseDate:      string;
  AccountId:      string;
  RecordTypeId:   string;
  Delegation__c:  string;
  Division__c:    string;
  BusinessLine__c:string;
  Activity__c:    string;
  Section__c:     string;
  ContactId__c:   string;
  [key: string]: unknown;
}

export function buildOpportunity(overrides: Partial<OpportunityFixture> = {}): OpportunityFixture {
  const closeDate = faker.date.future({ years: 1 });

  return {
    Name:            faker.commerce.productName(),
    StageName:       'Nueva',
    CloseDate:       closeDate.toISOString().split('T')[0],
    AccountId:       OPP_REFS.ACCOUNT_ID,
    RecordTypeId:    OPP_REFS.RECORD_TYPE,
    Delegation__c:   OPP_REFS.DELEGATION,
    Division__c:     'INS',
    BusinessLine__c: 'MC',
    Activity__c:     '2410',
    Section__c:      'MI',
    ContactId__c:    OPP_REFS.CONTACT_ID,
    ...overrides,
  };
}
