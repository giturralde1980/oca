import { buildQuote, QuoteFixture } from './quote.fixture';

export const QUOTE_INDUSTRIA_REFS = {
  PRICEBOOK_ID:           '01s0900000IoUTsAAN',
  ACCOUNT_ID:             '001JW000007t8vWYAQ',
  CONTACT_ID:             '003JW00000xb6QxYAI',
  DELEGATION:             '001JW000007SxPKYA0',
  ASSIGNED_COMMERCIAL:    '005Qu0000002BiXIAU',
  BILLING_PROFILE:        'a1XJW000002zb372AA',
};

export function buildQuoteIndustria(
  opportunityId: string | null,
  overrides: Partial<QuoteFixture> = {},
): QuoteFixture {
  return buildQuote(opportunityId as string, {
    Pricebook2Id:             QUOTE_INDUSTRIA_REFS.PRICEBOOK_ID,
    ContactId:                QUOTE_INDUSTRIA_REFS.CONTACT_ID,
    Status:                   'Nueva',
    Delegation__c:            QUOTE_INDUSTRIA_REFS.DELEGATION,
    BusinessLine__c:          'RG',
    Section__c:               'AC',
    Society__c:               '7010',
    Activity__c:              '6100',
    Actividad_LN__c:          '6100_1',
    BillingProfile__c:        QUOTE_INDUSTRIA_REFS.BILLING_PROFILE,
    AssignedCommercial__c:    QUOTE_INDUSTRIA_REFS.ASSIGNED_COMMERCIAL,
    Origin__c:                        'Ampliación de cartera',
    EntryChannel__c:                  'Visita comercial - Operaciones',
    ...overrides,
  });
}
