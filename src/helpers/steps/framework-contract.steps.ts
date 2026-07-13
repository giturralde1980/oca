import { createOpportunity } from './opportunity.steps';
import { createQuote, createQuoteLineItem } from './quote.steps';
import { updateRecord } from '../salesforce-crud.helper';
import { getOrgRefs } from '../../config/org-refs';
import { TestReport } from '../report.helper';

// "Contrato Marco" is not a separate Salesforce object — it's a Quote with
// RecordTypeId = Framework_Contract (vs. Comercial_Offer for Oferta Comercial). Discovered by
// following RelatedContract__c (label "Linked framework agreement"), a QuoteLineItem field that
// references Quote itself.
export const FRAMEWORK_CONTRACT_RECORD_TYPE = '01209000000iw4WAAQ';

export interface FrameworkContractSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

/**
 * Builds a minimal valid Framework Contract (Contrato Marco): Opportunity → Quote (Framework
 * Contract RT) → one QuoteLineItem. Field recipe found empirically — creating a Framework
 * Contract Quote enforces validations not present on a regular Comercial_Offer Quote:
 *   - NationalScope__c (or TerritorialScope__c) must be set ("scope of application").
 *   - BusinessLine__c, Division__c, Section__c, ContractEndDate__c, Activity__c are mandatory
 *     ("Division, Line of business, Section, Activity, Delegation and Contract end date must be
 *     reported in a framework contract").
 */
export async function setupFrameworkContract(report: TestReport): Promise<FrameworkContractSetup> {
  const refs = getOrgRefs('RG', 'INS');

  const oppId = await createOpportunity({
    Name:            `E2E Contrato Marco ${Date.now()}`,
    RecordTypeId:    refs.opp.recordTypeId,
    StageName:       'Nueva',
    CloseDate:       new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    AccountId:       refs.shared.accountId,
    ContactId__c:    refs.opp.contactId,
    Delegation__c:   refs.opp.delegationId,
    Section__c:      refs.opp.section,
    BusinessLine__c: 'RG',
    Division__c:     'INS',
  });
  report.step('Crear Opportunity', { 'Opportunity Id': oppId }, 'ok');

  const contractEndDate = new Date();
  contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

  const quoteId = await createQuote({
    Name:                         `E2E Contrato Marco ${Date.now()}`,
    OpportunityId:                oppId,
    RecordTypeId:                 FRAMEWORK_CONTRACT_RECORD_TYPE,
    Society__c:                   refs.quote.society,
    Pricebook2Id:                 refs.quote.pricebook2Id,
    ContactId:                    refs.quote.contactId,
    Delegation__c:                refs.quote.delegationId,
    OrderType__c:                 refs.quote.orderType,
    BillingProfile__c:            refs.quote.billingProfileId,
    PaymentResponsibleContact__c: refs.quote.paymentResponsibleId,
    Status:                       'Nueva',
    NationalScope__c:             true,
    BusinessLine__c:              'RG',
    Division__c:                  'INS',
    Section__c:                   'AC',
    ContractEndDate__c:           contractEndDate.toISOString().slice(0, 10),
    Activity__c:                  '6100',
  });
  report.step('Crear Contrato Marco (Quote Framework_Contract)', { 'Quote Id': quoteId, 'Opportunity Id': oppId }, 'ok');

  const lineItemId = await createQuoteLineItem({
    QuoteId:            quoteId,
    PricebookEntryId:   refs.qli.pricebookEntryId,
    Quantity:           1,
    UnitPrice:          120,
    SelectedPrice__c:   120,
    Asset__c:           refs.qli.assetId,
    Description:        'E2E Contrato Marco — línea',
    Subtotal__c:        120,
    Discount__c:        0,
    Activity__c:        '6100',
    Actividad_LN__c:    '6100_1',
    Bypass_Apex__c:     true,
  });
  report.step('Añadir línea de producto', { 'LineItem Id': lineItemId, 'Quote Id': quoteId }, 'ok');

  return { oppId, quoteId, lineItemId };
}

/**
 * Sets the fields required to close a Framework Contract as won ("cerrar como ganado").
 * AgreementResponsible__c is a User lookup; BillingResponsible__c/DispatchResponsible__c are
 * restricted picklists (values: 'Central' | 'Delegación'), not lookups — despite their labels
 * ("Responsible for invoicing/delivery note") suggesting otherwise.
 */
export async function setWinResponsibleFields(quoteId: string, report: TestReport): Promise<void> {
  const refs = getOrgRefs('RG', 'INS');
  await updateRecord('Quote', quoteId, {
    AgreementResponsible__c: refs.shared.assignedCommercialId,
    BillingResponsible__c:   'Central',
    DispatchResponsible__c:  'Central',
  });
  report.step('Completar responsables para ganar el Contrato Marco', { 'Quote Id': quoteId }, 'ok');
}
