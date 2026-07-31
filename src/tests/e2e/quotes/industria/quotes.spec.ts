import { setupPactum }             from '../../../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../../../helpers/report.helper';
import { verifyOrderSyncedByOrderId, queryWorkOrderByOrderId, assertServiceAppointmentForOrder, scheduleServiceAppointment, dispatchServiceAppointment, assignTechnicianToWorkOrder, releaseServiceAppointment } from '../../../../helpers/steps/order.steps';
import {
  getSourceLineItem,
  setupIndustriaQuote,
  changeQuoteStatus,
  changeIndustriaQuoteStatusToWon,
  waitAndPatchIndustriaOrderActivity,
  assertIntegrationSuccess,
  SourceLineItem,
} from '../../../../helpers/steps/industria-quote.steps';
import { getTestData } from '../../../../config/testdata';

interface StepsTestData { SOURCE_QUOTE_ID: { industria: string } }

const SOURCE_QUOTE_ID = getTestData<StepsTestData>('steps').SOURCE_QUOTE_ID.industria;

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

  it('[e2e] @C1314 Industria → Won → Order SAP → Service Appointment → Dispatched', async () => {
    const report = new TestReport('E2E Industria — Won → Order SAP → Service Appointment → Dispatched');
    try {
      const { oppId, quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Generada', report);

      // Include Activity in the won PATCH — the UI form sets this explicitly and the trigger
      // uses it when creating the Order; without it, Order.Activity__c = null → ProfitCenter=CK0800.
      // Concurrent poll patches the Order Activity as safety net.
      const [, { orderId, assetId }] = await Promise.all([
        changeIndustriaQuoteStatusToWon(quoteId, report),
        waitAndPatchIndustriaOrderActivity(quoteId, report),
      ]);
      expect(orderId).toBeTruthy();
      report.step('Verificar Order creado', { 'Quote Id': quoteId, 'Order Id': orderId }, 'ok');

      await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });
      report.step('Verificar SAP sync (Order)', { 'Order Id': orderId }, 'ok');

      const irecs = await assertIntegrationSuccess(orderId, 1, report, 'Verificar Integration_Request (Order)');
      expect(irecs[0].Status__c).toBe('success');

      const workOrderId = await queryWorkOrderByOrderId(orderId);
      expect(workOrderId).toBeTruthy();
      console.log(`[e2e] Order Id:     ${orderId}`);
      console.log(`[e2e] WorkOrder Id: ${workOrderId}`);

      const sa = await assertServiceAppointmentForOrder(orderId, report);
      expect(sa.Id).toBeTruthy();
      expect(sa.Status).toBe('pending_scheduling');
      console.log(`[e2e] SA Id:        ${sa.Id}  (Status: ${sa.Status})`);

      await scheduleServiceAppointment(sa.Id, report);

      await assignTechnicianToWorkOrder(workOrderId!, report, assetId);
      await dispatchServiceAppointment(sa.Id, report);

      const saIrecs = await assertIntegrationSuccess(sa.Id, 1, report, 'Verificar Integration_Request (ServiceAppointment)');
      expect(saIrecs[0].Status__c).toBe('success');
      console.log(`[e2e] Technician__c + Activo__c asignados en WorkOrder ${workOrderId}`);

      // Free the asset: move SA out of 'dispatched' so next run can reuse it
      await releaseServiceAppointment(sa.Id);

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 360000);
});
