import { buildQuote, QuoteFixture } from './quote.fixture';
import { getTestData } from '../../config/testdata';

interface QuoteFormacionRefs {
  RECORD_TYPE: string; PRICEBOOK_ID: string; ACCOUNT_ID: string; CONTACT_ID: string;
  DELEGATION: string; BILLING_PROFILE: string; ASSIGNED_COMMERCIAL: string;
  DELEGATION_RESPONSIBLE: string; DIVISION_RESPONSIBLE: string; PAYMENT_RESPONSIBLE: string;
}
interface QuoteTestData { formacion: QuoteFormacionRefs }

// RECORD_TYPE: Oferta formación
export const QUOTE_FORMACION_REFS = getTestData<QuoteTestData>('quote').formacion;

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
