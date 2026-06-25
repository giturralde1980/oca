import { faker } from '@faker-js/faker';
import { OpportunityFixture } from './opportunity.fixture';

export const OPP_FORMACION_REFS = {
  RECORD_TYPE: '012JW000000BzmdYAC',   // LN FO - Privada
  ACCOUNT_ID:  '001JW000007t8vWYAQ',
  CONTACT_ID:  '003JW00000y1YYoYAM',
  DELEGATION:  '001JW000015LASPYA4',
};

export function buildOpportunityFormacion(
  overrides: Partial<OpportunityFixture> = {},
): OpportunityFixture {
  const closeDate = new Date();
  closeDate.setFullYear(closeDate.getFullYear() + 1);

  return {
    Name:            faker.commerce.productName(),
    StageName:       'Nueva',
    CloseDate:       closeDate.toISOString().split('T')[0],
    AccountId:       OPP_FORMACION_REFS.ACCOUNT_ID,
    RecordTypeId:    OPP_FORMACION_REFS.RECORD_TYPE,
    Delegation__c:   OPP_FORMACION_REFS.DELEGATION,
    Division__c:     'FORM',
    BusinessLine__c: 'FO',
    Section__c:      'EC',
    Activity__c:     '2504',
    Society__c:      '1400',
    ContactId__c:    OPP_FORMACION_REFS.CONTACT_ID,
    ...overrides,
  };
}
