import { createOpportunity }    from './opportunity.steps';
import { createQuote, createQuoteLineItem } from './quote.steps';
import { buildOpportunityIDI }  from '../fixtures/opportunity.idi.fixture';
import { buildQuoteIDI }         from '../fixtures/quote.idi.fixture';
import { TestReport }            from '../report.helper';
import {
  SourceLineItem,
  IntegrationRequest,
  getSourceLineItem,
  changeQuoteStatus as changeQuoteStatusBase,
  assertIntegrationSuccess,
  assertQuoteURL,
  assertSAPReferenceOrderNumber,
} from './quote-common.steps';

export type { SourceLineItem, IntegrationRequest };
export { getSourceLineItem, assertIntegrationSuccess, assertQuoteURL, assertSAPReferenceOrderNumber };

export interface IDIQuoteSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

const REJECTION_REASON    = 'Datos Incorrectos';
const CANCELLATION_REASON = 'More expensive rate than elsewhere';

export function changeQuoteStatus(quoteId: string, status: string, report: TestReport): Promise<void> {
  return changeQuoteStatusBase(quoteId, status, report, REJECTION_REASON, CANCELLATION_REASON);
}

export async function setupIDIQuote(sourceLI: SourceLineItem, report: TestReport): Promise<IDIQuoteSetup> {
  const oppId = await createOpportunity(buildOpportunityIDI());
  report.step('Crear Opportunity IDI', { 'Opportunity Id': oppId });

  const quoteId = await createQuote(buildQuoteIDI(oppId));
  report.step('Crear Quote IDI', { 'Quote Id': quoteId, 'Opportunity Id': oppId, 'Status': 'Nueva', 'Type': 'Oferta IDI' });

  const lineItemId = await createQuoteLineItem({
    QuoteId:            quoteId,
    PricebookEntryId:   sourceLI.PricebookEntryId,
    Quantity:           sourceLI.Quantity         ?? 1,
    UnitPrice:          sourceLI.SelectedPrice__c ?? 0, // = SelectedPrice__c: sin esto, la validation rule de QuoteLineItem rechaza el gap entre precio de lista y precio seleccionado cuando Discount__c es 0
    SelectedPrice__c:   sourceLI.SelectedPrice__c ?? 0,
    Activity__c:        sourceLI.Activity__c      ?? '',
    Subactivity__c:     sourceLI.Subactivity__c   ?? '',
    Holder__c:          sourceLI.Holder__c,
    Asset__c:           sourceLI.Asset__c         ?? null,
    Actividad_LN__c:    sourceLI.Actividad_LN__c  ?? '',
    Discount__c:        sourceLI.Discount__c      ?? 0,
    RelatedContract__c: quoteId,
    Subtotal__c:        sourceLI.Subtotal__c      ?? 0,
    Taxes__c:           sourceLI.Taxes__c         ?? 0,
    TaxesTotal__c:      sourceLI.TaxesTotal__c    ?? 0,
    Fee__c:             sourceLI.Fee__c           ?? 0,
    Bypass_Apex__c:     true,
    Description:        sourceLI.Description ?? 'E2E Api Test',
    ProductName__c:     'E2E Api Test',
  });
  report.step('Añadir producto (QuoteLineItem)', { 'LineItem Id': lineItemId, 'PricebookEntry Id': sourceLI.PricebookEntryId, 'ProductName': 'E2E Api Test' });

  return { oppId, quoteId, lineItemId };
}
