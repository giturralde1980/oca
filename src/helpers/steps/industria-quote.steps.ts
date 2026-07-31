import { createOpportunity }    from './opportunity.steps';
import { createQuote, createQuoteLineItem } from './quote.steps';
import { buildOpportunityIndustria } from '../fixtures/opportunity.industria.fixture';
import { buildQuoteIndustria }        from '../fixtures/quote.industria.fixture';
import { TestReport }                 from '../report.helper';
import { patchOrderActivity, queryOrderByQuoteId } from './order.steps';
import { sfQuery }                    from '../salesforce-query.helper';
import { getIndustriaAccountRefs }    from '../../config/industria-account';
import pactum from 'pactum';

// Cuenta de Industria (TAIKA por defecto, o la generada por setup-industria-account.ts si
// existe para este entorno) — sus assets mantienen el titularId de la SA con el mapeo de
// delegacionId en Mobility.

/**
 * Returns the first TAIKA-owned asset that is not currently blocked by a Dispatched
 * ServiceAppointment. Salesforce prevents modifying an Asset linked to a Dispatched SA,
 * so each test run must pick one that's free.
 *
 * Uses two queries because SOQL does not support nested semi-joins:
 *   1. Get AssetIds of WorkOrders that have Dispatched SAs.
 *   2. Get TAIKA assets not in that exclusion set.
 */
export async function queryAvailableIndustriaAsset(): Promise<string> {
  const { accountId } = getIndustriaAccountRefs();

  // Get assets with all required address fields filled (validation rule rejects dispatch otherwise).
  // City__c is intentionally always null on Instalación assets (NBK_AssetTriggerHelper clears it
  // and uses Municipality__c instead) — checking City__c here would never match.
  const candidates = await sfQuery.query<{ Id: string }>(
    `SELECT Id FROM Asset
     WHERE AccountId = '${accountId}'
       AND CAERequired__c != null
       AND Address__c  != null
       AND Municipality__c != null
       AND PostalCode__c != null
       AND Country__c  != null
       AND Province__c != null`,
  );
  if (candidates.length === 0) throw new Error('No available Industria assets with required address fields found');

  const candidateIds = candidates.map(a => `'${a.Id}'`).join(',');

  // Single semi-join: WorkOrders using one of our TAIKA assets that have a Dispatched SA.
  // Scoping the outer query to our 6 assets avoids building a huge IN clause from all org SAs.
  const blockedWOs = await sfQuery.query<{ AssetId: string }>(
    `SELECT AssetId FROM WorkOrder
     WHERE AssetId IN (${candidateIds})
       AND AssetId != null
       AND Id IN (SELECT ParentRecordId FROM ServiceAppointment WHERE Status = 'Dispatched')`,
  );
  const blockedIds = new Set(blockedWOs.map(r => r.AssetId));

  const available = candidates.find(a => !blockedIds.has(a.Id));
  if (!available) throw new Error('No available Industria asset found (all TAIKA assets are locked by Dispatched SAs)');
  return available.Id;
}
import {
  SourceLineItem,
  IntegrationRequest,
  getSourceLineItem,
  changeQuoteStatus,
  assertIntegrationSuccess,
} from './quote-common.steps';

export type { SourceLineItem, IntegrationRequest };
export { getSourceLineItem, changeQuoteStatus, assertIntegrationSuccess };

export interface IndustriaQuoteSetup {
  oppId:      string;
  quoteId:    string;
  lineItemId: string;
}

export async function setupIndustriaQuote(sourceLI: SourceLineItem, report: TestReport): Promise<IndustriaQuoteSetup> {
  const oppId = await createOpportunity(buildOpportunityIndustria());
  report.step('Crear Opportunity Industria', { 'Opportunity Id': oppId });

  const quoteId = await createQuote(buildQuoteIndustria(oppId));
  report.step('Crear Quote Industria', { 'Quote Id': quoteId, 'Opportunity Id': oppId, 'Status': 'Nueva', 'Type': 'Oferta comercial' });

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
    Description:        sourceLI.Description ?? 'E2E Api Test',
    ProductName__c:     'E2E Api Test',
  });
  report.step('Añadir producto (QuoteLineItem)', { 'LineItem Id': lineItemId, 'PricebookEntry Id': sourceLI.PricebookEntryId, 'ProductName': 'E2E Api Test' });

  return { oppId, quoteId, lineItemId };
}

/**
 * Transitions Quote to 'won' including Activity fields in the PATCH body.
 * The UI form explicitly sets Activity during the won transition; the API must do the same
 * so Salesforce uses these values when creating the Order (otherwise Order.Activity__c = null).
 */
export async function changeIndustriaQuoteStatusToWon(quoteId: string, report: TestReport): Promise<void> {
  await pactum.spec()
    .patch(`/sobjects/Quote/${quoteId}`)
    .withBody({ Status: 'won', Activity__c: '6100', Actividad_LN__c: '6100_1' })
    .withRequestTimeout(60000)
    .expectStatus(204);
  report.step('Cambiar estado Quote → won', { 'Quote Id': quoteId, 'Status': 'won', 'Activity__c': '6100' });
}

export async function patchIndustriaOrderActivity(orderId: string, report: TestReport): Promise<void> {
  await patchOrderActivity(orderId, '6100', '6100_1');
  report.step('Parchear Activity en Order', { 'Order Id': orderId, 'Activity__c': '6100', 'Actividad_LN__c': '6100_1' });
}

/**
 * Polls for the Order every intervalMs and patches Activity as soon as it appears.
 * Run this concurrently with changeQuoteStatus('won') so the patch arrives before
 * SAP fires (~7s after Order creation), even though the won PATCH blocks for ~40s.
 * Returns both the orderId and the resolved assetId so the same asset is reused
 * when assigning the WorkOrder.
 */
export async function waitAndPatchIndustriaOrderActivity(
  quoteId:     string,
  report:      TestReport,
  intervalMs   = 500,
  maxAttempts  = 120,
): Promise<{ orderId: string; assetId: string }> {
  const assetId = await queryAvailableIndustriaAsset();
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const orderId = await queryOrderByQuoteId(quoteId);
    if (orderId) {
      await patchOrderActivity(orderId, '6100', '6100_1', assetId);
      report.step('Parchear Activity en Order', { 'Order Id': orderId, 'Activity__c': '6100', 'Actividad_LN__c': '6100_1', 'Activo__c': assetId });
      return { orderId, assetId };
    }
  }
  throw new Error(`Order not found within ${(maxAttempts * intervalMs) / 1000}s for Quote ${quoteId}`);
}
