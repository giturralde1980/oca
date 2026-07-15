import { createOpportunity } from './opportunity.steps';
import { createQuote, createQuoteLineItem } from './quote.steps';
import { changeQuoteStatus } from './quote-common.steps';
import { updateRecord } from '../salesforce-crud.helper';
import { queryOrderByQuoteId } from './order.steps';
import { getOrgRefs } from '../../config/org-refs';
import { TestReport } from '../report.helper';

// RG/INS's own OrderType is ZSER (unlike the special Industria-flow seed quote, which produces
// ZOBR orders) — needed whenever a test specifically requires a ZSER Sales Order, e.g. as the
// "Pedido de venta" a Purchase Order gets related to.
export interface RGQuoteSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

export async function setupRGQuote(report: TestReport): Promise<RGQuoteSetup> {
  const refs = getOrgRefs('RG', 'INS');

  const oppId = await createOpportunity({
    Name:            `E2E RG ZSER Quote ${Date.now()}`,
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
  report.step('Crear Opportunity (RG/INS)', { 'Opportunity Id': oppId }, 'ok');

  const quoteId = await createQuote({
    Name:                         `E2E RG ZSER Quote ${Date.now()}`,
    OpportunityId:                oppId,
    RecordTypeId:                 refs.quote.recordTypeId,
    Society__c:                   refs.quote.society,
    Pricebook2Id:                 refs.quote.pricebook2Id,
    ContactId:                    refs.quote.contactId,
    Delegation__c:                refs.quote.delegationId,
    OrderType__c:                 refs.quote.orderType,
    BillingProfile__c:            refs.quote.billingProfileId,
    PaymentResponsibleContact__c: refs.quote.paymentResponsibleId,
    Status:                       'Nueva',
    Holder__c:                    refs.shared.accountId,
    Payer__c:                     refs.shared.accountId,
    AssignedCommercial__c:        refs.shared.assignedCommercialId,
  });
  report.step('Crear Oferta (RG/INS, ZSER)', { 'Quote Id': quoteId, 'Opportunity Id': oppId }, 'ok');

  const lineItemId = await createQuoteLineItem({
    QuoteId:            quoteId,
    PricebookEntryId:   refs.qli.pricebookEntryId,
    Quantity:           1,
    UnitPrice:          120,
    SelectedPrice__c:   120,
    Asset__c:           refs.qli.assetId,
    Description:        'E2E RG ZSER',
    Subtotal__c:        120,
    Discount__c:        0,
    Activity__c:        '6100',
    Actividad_LN__c:    '6100_1',
    Bypass_Apex__c:     true,
  });
  report.step('Añadir línea de producto', { 'LineItem Id': lineItemId, 'Quote Id': quoteId }, 'ok');

  return { oppId, quoteId, lineItemId };
}

/** Wins the RG/INS Quote and polls for the resulting Order (SAP sync is not awaited here). */
export async function winRGQuoteAndGetOrder(
  quoteId: string,
  report: TestReport,
  { maxAttempts = 10, delayMs = 5000 }: { maxAttempts?: number; delayMs?: number } = {},
): Promise<string> {
  await changeQuoteStatus(quoteId, 'Generada', report);
  await new Promise(r => setTimeout(r, 3000));
  await updateRecord('Quote', quoteId, { Status: 'won' }, 60000);
  report.step('Cambiar estado Oferta → won', { 'Quote Id': quoteId }, 'ok');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const orderId = await queryOrderByQuoteId(quoteId);
    if (orderId) {
      report.step('Verificar Pedido generado', { 'Quote Id': quoteId, 'Order Id': orderId }, 'ok');
      return orderId;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`Order not created within ${(maxAttempts * delayMs) / 1000}s for Quote ${quoteId}`);
}
