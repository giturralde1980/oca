import { createOpportunity }             from './opportunity.steps';
import { createQuote, createQuoteLineItem, getQuote } from './quote.steps';
import { buildOpportunityFormacion }       from '../fixtures/opportunity.formacion.fixture';
import { buildQuoteFormacion }             from '../fixtures/quote.formacion.fixture';
import { TestReport }                      from '../report.helper';
import { updateRecord }                    from '../salesforce-crud.helper';
import {
  SourceLineItem,
  getSourceLineItem,
  changeQuoteStatus as changeQuoteStatusBase,
} from './quote-common.steps';

export type { SourceLineItem };
export { getSourceLineItem };

export interface FormacionQuoteSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

const REJECTION_REASON = 'Datos Incorrectos';

export async function changeQuoteStatus(quoteId: string, status: string, report: TestReport): Promise<void> {
  if (status === 'Aceptada') {
    // Aceptada requires DTT_fld_ImporteAdjudicado__c (awarded bid amount)
    await updateRecord('Quote', quoteId, { Status: status, DTT_fld_ImporteAdjudicado__c: 22 });
    report.step(`Cambiar estado Quote → ${status}`, { 'Quote Id': quoteId, 'Status': status, 'DTT_fld_ImporteAdjudicado__c': '22' });
    return;
  }
  return changeQuoteStatusBase(quoteId, status, report, REJECTION_REASON);
}

export async function setupFormacionQuote(sourceLI: SourceLineItem, report: TestReport): Promise<FormacionQuoteSetup> {
  const oppId = await createOpportunity(buildOpportunityFormacion());
  report.step('Crear Opportunity Formación', { 'Opportunity Id': oppId });

  const quoteId = await createQuote(buildQuoteFormacion(oppId));
  report.step('Crear Quote Formación', { 'Quote Id': quoteId, 'Opportunity Id': oppId, 'Status': 'Nueva', 'Type': 'Oferta formación' });

  const lineItemId = await createQuoteLineItem({
    QuoteId:            quoteId,
    PricebookEntryId:   sourceLI.PricebookEntryId,
    Quantity:           sourceLI.Quantity         ?? 1,
    UnitPrice:          sourceLI.UnitPrice        ?? 0,
    SelectedPrice__c:   sourceLI.SelectedPrice__c ?? 0,
    Activity__c:        sourceLI.Activity__c      ?? '',
    Subactivity__c:     sourceLI.Subactivity__c   ?? '',
    Holder__c:          sourceLI.Holder__c        ?? null,
    Asset__c:           sourceLI.Asset__c         ?? null,
    Actividad_LN__c:    sourceLI.Actividad_LN__c  ?? '',
    Discount__c:        sourceLI.Discount__c      ?? 0,
    RelatedContract__c: quoteId,
    Subtotal__c:        sourceLI.Subtotal__c      ?? 0,
    Taxes__c:           sourceLI.Taxes__c         ?? 0,
    TaxesTotal__c:      sourceLI.TaxesTotal__c    ?? 0,
    Fee__c:             sourceLI.Fee__c           ?? 0,
    Bypass_Apex__c:     true,
    Description:        sourceLI.Description      ?? 'E2E Api Test',
    ProductName__c:     'E2E Api Test',
  });
  report.step('Añadir producto (QuoteLineItem)', { 'LineItem Id': lineItemId, 'PricebookEntry Id': sourceLI.PricebookEntryId });

  return { oppId, quoteId, lineItemId };
}

export async function assertQuoteStatus(quoteId: string, expectedStatus: string, report: TestReport): Promise<void> {
  const quote  = await getQuote(quoteId) as { Status: string };
  const actual = quote.Status;
  report.step(
    `Verificar Quote.Status = ${expectedStatus}`,
    { 'Quote Id': quoteId, 'Status': actual },
    actual === expectedStatus ? 'ok' : 'fail',
  );
  if (actual !== expectedStatus) {
    throw new Error(`Expected Quote.Status '${expectedStatus}' but got '${actual}'`);
  }
}
