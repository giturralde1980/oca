import { setupPactum }             from '../../../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../../../helpers/report.helper';
import { verifyOrderSyncedByOrderId, assertServiceAppointmentForOrder, scheduleServiceAppointment } from '../../../../helpers/steps/order.steps';
import {
  getSourceLineItem,
  setupIndustriaQuote,
  changeQuoteStatus,
  changeIndustriaQuoteStatusToWon,
  waitAndPatchIndustriaOrderActivity,
  assertIntegrationSuccess,
  SourceLineItem,
} from '../../../../helpers/steps/industria-quote.steps';

const SOURCE_QUOTE_ID = '0Q0JW0000083YJt0AM';

describe('Funcional — Quotes Industria', () => {
  let suite:    SuiteReport;
  let sourceLI: SourceLineItem;

  beforeAll(async () => {
    await setupPactum();
    suite    = new SuiteReport('E2E Quotes — Industria', 'Industria');
    sourceLI = await getSourceLineItem(SOURCE_QUOTE_ID);
  });

  afterAll(() => {
    const reportPath = suite.generate('reports');
    suite.serialize('reports/.tmp');
    console.log(`\n[suite] Reporte generado: ${reportPath}`);
  });

  it('[e2e] Industria → Won → Order SAP', async () => {
    const report = new TestReport('E2E Industria — Won → Order SAP');
    try {
      const { oppId, quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Generada', report);

      // Include Activity in the won PATCH — the UI form sets this explicitly and the trigger
      // uses it when creating the Order; without it, Order.Activity__c = null → ProfitCenter=CK0800.
      // Concurrent poll patches the Order Activity as safety net.
      const [, orderId] = await Promise.all([
        changeIndustriaQuoteStatusToWon(quoteId, report),
        waitAndPatchIndustriaOrderActivity(quoteId, report),
      ]);
      expect(orderId).toBeTruthy();
      report.step('Verificar Order creado', { 'Quote Id': quoteId, 'Order Id': orderId }, 'ok');

      await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });
      report.step('Verificar SAP sync (Order)', { 'Order Id': orderId }, 'ok');

      const irecs = await assertIntegrationSuccess(orderId, 1, report, 'Verificar Integration_Request (Order)');
      expect(irecs[0].Status__c).toBe('success');

      const sa = await assertServiceAppointmentForOrder(orderId, report);
      expect(sa.Id).toBeTruthy();
      expect(sa.Status).toBe('pending_scheduling');

      await scheduleServiceAppointment(sa.Id, report);

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 360000);
});
