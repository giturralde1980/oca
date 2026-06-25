import { faker } from '@faker-js/faker';
import { buildQuote, QuoteFixture } from './quote.fixture';

export const QUOTE_IDI_REFS = {
  RECORD_TYPE:             '012JW000005ifXdYAI',
  PRICEBOOK_ID:            '01sJW00000A9scvYAB',
  ACCOUNT_ID:              '001JW000007t8vWYAQ',
  CONTACT_ID:              '003JW00001BwMe1YAF',
  DELEGATION:              '001JW00000sULUXYA4',
  AREA:                    '001JW00000sUJNwYAO',
  AREA_RESPONSIBLE:        '005JW00000Fk0sSYAR',
  ASSIGNED_COMMERCIAL:     '005JW00000cbpIyYAI',
  DELEGATION_RESPONSIBLE:  '005JW00000Fk0sSYAR',
  DIVISION_RESPONSIBLE:    '005Qu0000002BiXIAU',
  PAYMENT_RESPONSIBLE:     '003JW00001BwMe1YAF',
  BILLING_PROFILE:         'a1XJW000003Dhzt2AC',
};

export function buildQuoteIDI(
  opportunityId: string | null,
  overrides: Partial<QuoteFixture> = {},
): QuoteFixture {
  return buildQuote(opportunityId as string, {
    RecordTypeId:                  QUOTE_IDI_REFS.RECORD_TYPE,
    Pricebook2Id:                  QUOTE_IDI_REFS.PRICEBOOK_ID,
    ContactId:                     QUOTE_IDI_REFS.CONTACT_ID,
    Status:                        'Nueva',
    Type__c:                       'Oferta IDI',

    // Organización
    Delegation__c:                 QUOTE_IDI_REFS.DELEGATION,
    Division__c:                   'CERT',
    BusinessLine__c:               'ID',
    Section__c:                    '3100',
    Society__c:                    '8000',
    Activity__c:                   '',
    Actividad_LN__c:               '',

    // Partes
    Holder__c:                     QUOTE_IDI_REFS.ACCOUNT_ID,
    Payer__c:                      QUOTE_IDI_REFS.ACCOUNT_ID,
    Prescriber__c:                 QUOTE_IDI_REFS.ACCOUNT_ID,

    // Facturación
    TaxType__c:                    'ZMWS-3',
    TaxGroup__c:                   'ZMWS-3',
    BillingProfile__c:             QUOTE_IDI_REFS.BILLING_PROFILE,

    // IDI no requiere dirección física
    BillingStreet:                 '',
    BillingCity:                   '',
    BillingPostalCode:             '',
    BillingState:                  '',
    BillingCountry:                '',
    ShippingStreet:                '',
    ShippingCity:                  '',
    ShippingPostalCode:            '',
    ShippingState:                 '',
    ShippingCountry:               '',

    // Comercial
    Origin__c:                     'Mailing o carta masiva',
    EntryChannel__c:               'Teléfono',
    Area__c:                       QUOTE_IDI_REFS.AREA,
    Area_Responsible__c:           QUOTE_IDI_REFS.AREA_RESPONSIBLE,
    AssignedCommercial__c:         QUOTE_IDI_REFS.ASSIGNED_COMMERCIAL,
    Delegation_Responsible__c:     QUOTE_IDI_REFS.DELEGATION_RESPONSIBLE,
    Division_Responsible__c:       QUOTE_IDI_REFS.DIVISION_RESPONSIBLE,
    PaymentResponsibleContact__c:  QUOTE_IDI_REFS.PAYMENT_RESPONSIBLE,

    // IDI específico
    Tipo_de_proyecto__c:                     '3702',
    Calificaci_n_preliminar_del_proyecto__c: 'I+D',

    // Obligatorios para cambiar a estado "Ganada"
    T_tulo__c:     faker.commerce.productName(),
    Acr_nimo__c:   faker.string.alphanumeric(6).toUpperCase(),
    Consultant__c: QUOTE_IDI_REFS.ACCOUNT_ID,
    QuoteURL__c:   'https://placeholder.oca.es/oferta-idi',

    ...overrides,
  });
}
