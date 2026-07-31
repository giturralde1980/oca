import { faker } from '@faker-js/faker';
import { OpportunityFixture } from './opportunity.fixture';
import { getTestData } from '../../config/testdata';

interface OpportunityTestData {
  formacion: { RECORD_TYPE: string; ACCOUNT_ID: string; CONTACT_ID: string; DELEGATION: string };
}

// LN FO - Privada
export const OPP_FORMACION_REFS = getTestData<OpportunityTestData>('opportunity').formacion;

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
