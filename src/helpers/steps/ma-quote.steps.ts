import { createOpportunity } from './opportunity.steps';
import { createQuote, createQuoteLineItem } from './quote.steps';
import { changeQuoteStatus } from './quote-common.steps';
import { updateRecord } from '../salesforce-crud.helper';
import { queryOrderByQuoteId } from './order.steps';
import { getOrgRefs } from '../../config/org-refs';
import { TestReport } from '../report.helper';

// MA/INS (Medio Ambiente) uses OrderType=ZOBR and its accredited-inspection product
// (PricebookEntry already curated in org-refs.ts) is a "paquete" that expands into several
// Installation_parameters__c records per Asset on Order creation — relevant for C560 and C576.
//
// Winning a Quote for this business line requires three fields beyond what RG/INS needs
// (found via the Quote object's ValidationRule formulas through the Tooling API, not
// documented anywhere else):
//   - Holder__c (Account)             — Null_Holder_for_won_Quotes fires for BusinessLine RG/MA
//   - Payer__c (Account) + BillingProfile__c — QuoteStatus VR requires both together
//   - AssignedCommercial__c            — the User curated in org-refs.ts (assignedCommercialId)
//     for MA_INS is inactive in this org; must override with an active User.
// org-refs.ts's MA_INS.shared.assignedCommercialId points to an inactive User in this org —
// the "sales representative assigned to the budget is inactive" validation rejects it.
export const ACTIVE_COMMERCIAL_USER_ID = '005JW00000hAFEjYAO';

export interface MAQuoteSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

export async function setupMAQuote(report: TestReport, assignedCommercialId: string, assetId?: string): Promise<MAQuoteSetup> {
  const refs = getOrgRefs('MA', 'INS');

  const oppId = await createOpportunity({
    Name:            `E2E MA Quote ${Date.now()}`,
    RecordTypeId:    refs.opp.recordTypeId,
    StageName:       'Nueva',
    CloseDate:       new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    AccountId:       refs.shared.accountId,
    ContactId__c:    refs.opp.contactId,
    Delegation__c:   refs.opp.delegationId,
    Section__c:      refs.opp.section,
    BusinessLine__c: 'MA',
    Division__c:     'INS',
  });
  report.step('Crear Opportunity (MA/INS)', { 'Opportunity Id': oppId }, 'ok');

  const quoteId = await createQuote({
    Name:                         `E2E MA Quote ${Date.now()}`,
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
    AssignedCommercial__c:        assignedCommercialId,
  });
  report.step('Crear Oferta (MA/INS)', { 'Quote Id': quoteId, 'Opportunity Id': oppId }, 'ok');

  const lineItemId = await createQuoteLineItem({
    QuoteId:            quoteId,
    PricebookEntryId:   refs.qli.pricebookEntryId,
    Quantity:           1,
    UnitPrice:          525,
    SelectedPrice__c:   525,
    Asset__c:           assetId ?? refs.qli.assetId,
    Description:        'E2E MA — Inspección Acreditada (paquete)',
    Subtotal__c:        525,
    Discount__c:        0,
    Activity__c:        '6100',
    Actividad_LN__c:    '6100_1',
    Bypass_Apex__c:     true,
  });
  report.step('Añadir línea de producto (paquete)', { 'LineItem Id': lineItemId, 'Quote Id': quoteId }, 'ok');

  return { oppId, quoteId, lineItemId };
}

/** Wins the MA/INS Quote and polls for the resulting Order (SAP sync is not awaited here). */
export async function winMAQuoteAndGetOrder(
  quoteId: string,
  report: TestReport,
  { maxAttempts = 8, delayMs = 10000 }: { maxAttempts?: number; delayMs?: number } = {},
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
