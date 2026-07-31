import { faker } from '@faker-js/faker';
import { getTestData } from '../../config/testdata';

interface QuoteRefs {
  RECORD_TYPE: string; PRICEBOOK_ID: string; ACCOUNT_ID: string; CONTACT_ID: string;
  PRICEBOOK_ENTRY_ID: string; ASSET_ID: string; DELEGATION: string; AREA: string;
  AREA_RESPONSIBLE: string; ASSIGNED_COMMERCIAL: string; DELEGATION_RESPONSIBLE: string;
  DIVISION_RESPONSIBLE: string; PAYMENT_RESPONSIBLE: string; BILLING_PROFILE: string;
}
interface QuoteTestData { base: QuoteRefs }

export const QUOTE_REFS = getTestData<QuoteTestData>('quote').base;

export interface QuoteFixture {
  Name:                     string;
  OpportunityId:            string;
  BillingStreet:            string;
  BillingCity:              string;
  BillingPostalCode:        string;
  BillingState:             string;
  BillingCountry:           string;
  ShippingStreet:           string;
  ShippingCity:             string;
  ShippingPostalCode:       string;
  ShippingState:            string;
  ShippingCountry:          string;
  RecordTypeId:             string;
  Pricebook2Id:             string;
  ContactId:                string;
  Status:                   string;
  ExpirationDate:           string;
  Type__c:                  string;
  Delegation__c:            string;
  Division__c:              string;
  BusinessLine__c:          string;
  Activity__c:              string;
  Section__c:               string;
  Society__c:               string;
  Holder__c:                string;
  Payer__c:                 string;
  Prescriber__c:            string;
  OrderType__c:             string;
  Origin__c:                string;
  BillingFormat__c:         string;
  BillingType__c:           string;
  Language__c:              string;
  Country__c:               string;
  ContractStartDate__c:     string;
  ContractEndDate__c:       string;
  EntryChannel__c:          string;
  QuoteEvaluation__c:       string;
  QuoteHeader__c:           string;
  Area__c:                  string;
  Area_Responsible__c:      string;
  AssignedCommercial__c:    string;
  Delegation_Responsible__c:string;
  Division_Responsible__c:  string;
  PaymentResponsibleContact__c: string;
  BillingProfile__c:        string;
  NotificationDate__c:      string;
  AcceptRejectDate__c:      string;
  Actividad_LN__c:          string;
  [key: string]: unknown;
}

export function buildQuote(opportunityId: string, overrides: Partial<QuoteFixture> = {}): QuoteFixture {
  const today     = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  const endDate   = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const expDate   = new Date(startDate);
  expDate.setMonth(expDate.getMonth() + 6);

  return {
    Name:                     faker.commerce.productName(),
    OpportunityId:            opportunityId,
    BillingStreet:            'Carrer Major 10',
    BillingCity:              'Castelló de la Plana',
    BillingPostalCode:        '12001',
    BillingState:             'Castellón/Castelló',
    BillingCountry:           'España',
    ShippingStreet:           'Carrer Major 10',
    ShippingCity:             'Castelló de la Plana',
    ShippingPostalCode:       '12001',
    ShippingState:            'Castellón/Castelló',
    ShippingCountry:          'España',
    RecordTypeId:             QUOTE_REFS.RECORD_TYPE,
    Pricebook2Id:             QUOTE_REFS.PRICEBOOK_ID,
    ContactId:                QUOTE_REFS.CONTACT_ID,
    Status:                   'new',
    ExpirationDate:           expDate.toISOString().split('T')[0],
    Type__c:                  'Oferta comercial',
    Delegation__c:            QUOTE_REFS.DELEGATION,
    Division__c:              'INS',
    BusinessLine__c:          'MC',
    Activity__c:              '2410',
    Section__c:               'MI',
    Society__c:               '1708',
    Holder__c:                QUOTE_REFS.ACCOUNT_ID,
    Payer__c:                 QUOTE_REFS.ACCOUNT_ID,
    Prescriber__c:            QUOTE_REFS.ACCOUNT_ID,
    OrderType__c:             'ZSER',
    Origin__c:                'Campañas',
    BillingFormat__c:         'Normal',
    BillingType__c:           'order_billing',
    Language__c:              'ES',
    Country__c:               'ES',
    ContractStartDate__c:     startDate.toISOString().split('T')[0],
    ContractEndDate__c:       endDate.toISOString().split('T')[0],
    EntryChannel__c:          'Visita comercial - Gerencia',
    QuoteEvaluation__c:       'Medio',
    QuoteHeader__c:           'Prescriptor',
    Area__c:                  QUOTE_REFS.AREA,
    Area_Responsible__c:      QUOTE_REFS.AREA_RESPONSIBLE,
    AssignedCommercial__c:    QUOTE_REFS.ASSIGNED_COMMERCIAL,
    Delegation_Responsible__c:QUOTE_REFS.DELEGATION_RESPONSIBLE,
    Division_Responsible__c:  QUOTE_REFS.DIVISION_RESPONSIBLE,
    PaymentResponsibleContact__c: QUOTE_REFS.PAYMENT_RESPONSIBLE,
    BillingProfile__c:        QUOTE_REFS.BILLING_PROFILE,
    NotificationDate__c:      today,
    AcceptRejectDate__c:      today,
    Actividad_LN__c:          '2410',
    ...overrides,
  };
}

export interface QuoteLineItemFixture {
  QuoteId:           string;
  PricebookEntryId:  string;
  Quantity:          number;
  UnitPrice:         number;
  SelectedPrice__c:  number;
  Activity__c:       string;
  Subactivity__c:    string;
  Holder__c:         string;
  Asset__c:          string;
  Actividad_LN__c:   string;
  Discount__c:       number;
  RelatedContract__c:string;
  Subtotal__c:       number;
  Taxes__c:          number;
  TaxesTotal__c:     number;
  Fee__c:            number;
  Bypass_Apex__c:    boolean;
  [key: string]: unknown;
}

export function buildQuoteLineItem(quoteId: string, overrides: Partial<QuoteLineItemFixture> = {}): QuoteLineItemFixture {
  return {
    QuoteId:           quoteId,
    PricebookEntryId:  QUOTE_REFS.PRICEBOOK_ENTRY_ID,
    Quantity:          1,
    UnitPrice:         150,
    SelectedPrice__c:  150,
    Activity__c:       '2430',
    Subactivity__c:    '2431',
    Holder__c:         QUOTE_REFS.ACCOUNT_ID,
    Asset__c:          QUOTE_REFS.ASSET_ID,
    Actividad_LN__c:   '2430',
    Discount__c:       0,
    RelatedContract__c: quoteId,
    Subtotal__c:       150,
    Taxes__c:          0,
    TaxesTotal__c:     0,
    Fee__c:            0,
    Bypass_Apex__c:    true,
    ...overrides,
  };
}
