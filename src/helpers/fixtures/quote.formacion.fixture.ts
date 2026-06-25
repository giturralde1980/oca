import { buildQuote, QuoteFixture } from './quote.fixture';

export const QUOTE_FORMACION_REFS = {
  RECORD_TYPE:              '012JW000000BzmjYAC',   // Oferta formación
  PRICEBOOK_ID:             '01sJW000000bxdpYAA',
  ACCOUNT_ID:               '001JW000007t8vWYAQ',
  CONTACT_ID:               '003JW00000y1YYoYAM',
  DELEGATION:               '001JW000015LASPYA4',
  BILLING_PROFILE:          'a1XJW000000B4Q52AK',
  ASSIGNED_COMMERCIAL:      '005Qu0000002BiXIAU',
  DELEGATION_RESPONSIBLE:   '005JW000001Jo7AYAS',
  DIVISION_RESPONSIBLE:     '005Qu0000002BiXIAU',
  PAYMENT_RESPONSIBLE:      '003JW000008sws4YAA',
};

export function buildQuoteFormacion(
  opportunityId: string,
  overrides: Partial<QuoteFixture> = {},
): QuoteFixture {
  return buildQuote(opportunityId, {
    RecordTypeId:             QUOTE_FORMACION_REFS.RECORD_TYPE,
    Pricebook2Id:             QUOTE_FORMACION_REFS.PRICEBOOK_ID,
    ContactId:                QUOTE_FORMACION_REFS.CONTACT_ID,
    Status:                   'Nueva',
    Delegation__c:            QUOTE_FORMACION_REFS.DELEGATION,
    Division__c:              'FORM',
    BusinessLine__c:          'FO',
    Section__c:               'EC',
    Activity__c:              '2504',
    Actividad_LN__c:          '2504',
    Society__c:               '1400',
    Payer__c:                 QUOTE_FORMACION_REFS.ACCOUNT_ID,
    Prescriber__c:            QUOTE_FORMACION_REFS.ACCOUNT_ID,
    BillingProfile__c:        QUOTE_FORMACION_REFS.BILLING_PROFILE,
    AssignedCommercial__c:    QUOTE_FORMACION_REFS.ASSIGNED_COMMERCIAL,
    Delegation_Responsible__c: QUOTE_FORMACION_REFS.DELEGATION_RESPONSIBLE,
    Division_Responsible__c:  QUOTE_FORMACION_REFS.DIVISION_RESPONSIBLE,
    PaymentResponsibleContact__c: QUOTE_FORMACION_REFS.PAYMENT_RESPONSIBLE,
    BillingType__c:           'order_billing',
    // Fields not used in Formación
    Holder__c:                null as unknown as string,
    Type__c:                  null as unknown as string,
    OrderType__c:             null as unknown as string,
    QuoteHeader__c:           null as unknown as string,
    BillingFormat__c:         null as unknown as string,
    EntryChannel__c:          null as unknown as string,
    Area__c:                  null as unknown as string,
    Area_Responsible__c:      null as unknown as string,
    ...overrides,
  });
}
