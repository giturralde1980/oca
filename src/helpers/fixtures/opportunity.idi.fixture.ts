import { faker } from '@faker-js/faker';
import { OpportunityFixture } from './opportunity.fixture';

export const OPP_IDI_REFS = {
  RECORD_TYPE:  '012JW000000BzmcYAC',
  ACCOUNT_ID:   '001JW000007t8vWYAQ',
  CONTACT_ID:   '003JW00001BwMe1YAF',
  DELEGATION:   '001JW00000sULUXYA4',
};

export function buildOpportunityIDI(
  overrides: Partial<OpportunityFixture> = {},
): OpportunityFixture {
  const closeDate = new Date();
  closeDate.setFullYear(closeDate.getFullYear() + 1);

  return {
    Name:            faker.commerce.productName(),
    StageName:       'Nueva',
    CloseDate:       closeDate.toISOString().split('T')[0],
    AccountId:       OPP_IDI_REFS.ACCOUNT_ID,
    RecordTypeId:    OPP_IDI_REFS.RECORD_TYPE,
    Delegation__c:   OPP_IDI_REFS.DELEGATION,
    Division__c:     'CERT',
    BusinessLine__c: 'ID',
    Section__c:      '3100',
    Activity__c:     '',   // IDI no es valor válido en el picklist de Opportunity en este org
    ContactId__c:    OPP_IDI_REFS.CONTACT_ID,
    PaisEO__c:       'ES',
    PaisOCA__c:      'ES',
    CurrencyIsoCode: 'EUR',
    ...overrides,
  };
}
