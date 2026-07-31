import { faker } from '@faker-js/faker';
import { OpportunityFixture } from './opportunity.fixture';
import { getIndustriaAccountRefs } from '../../config/industria-account';
import { getTestData } from '../../config/testdata';

interface OpportunityTestData {
  industria: { RECORD_TYPE: string; DELEGATION: string };
}

// RECORD_TYPE: Genérica (mismo que base)
export const OPP_INDUSTRIA_REFS = getTestData<OpportunityTestData>('opportunity').industria;

export function buildOpportunityIndustria(
  overrides: Partial<OpportunityFixture> = {},
): OpportunityFixture {
  const closeDate = new Date();
  closeDate.setFullYear(closeDate.getFullYear() + 1);
  const { accountId, contactId } = getIndustriaAccountRefs();

  return {
    Name:            faker.commerce.productName(),
    StageName:       'Nueva',
    CloseDate:       closeDate.toISOString().split('T')[0],
    AccountId:       accountId,
    RecordTypeId:    OPP_INDUSTRIA_REFS.RECORD_TYPE,
    Delegation__c:   OPP_INDUSTRIA_REFS.DELEGATION,
    Division__c:     'INS',
    BusinessLine__c: 'RG',
    Section__c:      'AC',
    Activity__c:     '6100',
    ContactId__c:    contactId,
    ...overrides,
  };
}
