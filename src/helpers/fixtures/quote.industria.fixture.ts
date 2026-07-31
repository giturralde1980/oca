import { buildQuote, QuoteFixture } from './quote.fixture';
import { getIndustriaAccountRefs } from '../../config/industria-account';
import { getTestData } from '../../config/testdata';

interface QuoteIndustriaRefs { PRICEBOOK_ID: string; DELEGATION: string; ASSIGNED_COMMERCIAL: string }
interface QuoteTestData { industria: QuoteIndustriaRefs }

export const QUOTE_INDUSTRIA_REFS = getTestData<QuoteTestData>('quote').industria;

export function buildQuoteIndustria(
  opportunityId: string | null,
  overrides: Partial<QuoteFixture> = {},
): QuoteFixture {
  const { accountId, contactId, billingProfileId } = getIndustriaAccountRefs();

  return buildQuote(opportunityId as string, {
    Pricebook2Id:             QUOTE_INDUSTRIA_REFS.PRICEBOOK_ID,
    ContactId:                contactId,
    Status:                   'Nueva',
    Delegation__c:            QUOTE_INDUSTRIA_REFS.DELEGATION,
    BusinessLine__c:          'RG',
    Section__c:               'AC',
    Society__c:               '7010',
    Activity__c:              '6100',
    Actividad_LN__c:          '6100_1',
    BillingProfile__c:        billingProfileId,
    AssignedCommercial__c:    QUOTE_INDUSTRIA_REFS.ASSIGNED_COMMERCIAL,
    Origin__c:                        'Ampliación de cartera',
    EntryChannel__c:                  'Visita comercial - Operaciones',
    Holder__c:                accountId,
    Payer__c:                 accountId,
    Prescriber__c:            accountId,
    ...overrides,
  });
}
