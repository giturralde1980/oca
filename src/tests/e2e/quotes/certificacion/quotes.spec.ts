import { setupPactum }             from '../../../../helpers/request.helper';
import { getQuote }                from '../../../../helpers/steps/quote.steps';
import { TestReport, SuiteReport } from '../../../../helpers/report.helper';
import {
  getSourceLineItem,
  setupIDIQuote,
  changeQuoteStatus,
  assertIntegrationSuccess,
  assertQuoteURL,
  assertSAPReferenceOrderNumber,
  SourceLineItem,
} from '../../../../helpers/steps/idi-quote.steps';

const SOURCE_QUOTE_ID = '0Q0JW000008SWZp0AO';

describe('Funcional — Quotes IDI', () => {
  let suite:    SuiteReport;
  let sourceLI: SourceLineItem;

  beforeAll(async () => {
    await setupPactum();
    suite    = new SuiteReport('E2E Quotes — IDI', 'Certificación');
    sourceLI = await getSourceLineItem(SOURCE_QUOTE_ID);
  });

  afterAll(() => {
    const reportPath = suite.generate('reports');
    suite.serialize('reports/.tmp');
    console.log(`\n[suite] Reporte generado: ${reportPath}`);
  });

  it('[e2e] @C1311 IDI → Won → Firmada', async () => {
    const report = new TestReport('E2E IDI — Won → Firmada');
    try {
      const { oppId, quoteId, lineItemId } = await setupIDIQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Generada', report);
      await changeQuoteStatus(quoteId, 'won',      report);

      const wonRequests = await assertIntegrationSuccess(quoteId, 1, report, 'Verificar Integration_Request (won)');
      expect(wonRequests[0].Status__c).toBe('success');

      await changeQuoteStatus(quoteId, 'Firmada', report);

      const firmadaRequests = await assertIntegrationSuccess(quoteId, 2, report, 'Verificar Integration_Request (Firmada)');
      expect(firmadaRequests.length).toBeGreaterThanOrEqual(2);
      expect(firmadaRequests[0].Status__c).toBe('success');

      await assertSAPReferenceOrderNumber(quoteId, report);

      await assertQuoteURL(quoteId, report);
      const quoteData = await getQuote(quoteId) as { QuoteURL__c?: string };
      expect(quoteData.QuoteURL__c).toBeTruthy();
      expect(quoteData.QuoteURL__c).toMatch(/^https?:\/\/.+\..+/);

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 360000);

  it('[e2e] @C1312 IDI → Generada → Won → Rechazada', async () => {
    const report = new TestReport('E2E IDI — Won → Rechazada');
    try {
      const { oppId, quoteId, lineItemId } = await setupIDIQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Generada', report);
      await changeQuoteStatus(quoteId, 'won',      report);

      const wonRequests = await assertIntegrationSuccess(quoteId, 1, report, 'Verificar Integration_Request (won)');
      expect(wonRequests[0].Status__c).toBe('success');

      await changeQuoteStatus(quoteId, 'Rechazada', report);

      const rechazadaRequests = await assertIntegrationSuccess(quoteId, 2, report, 'Verificar Integration_Request (Rechazada)');
      expect(rechazadaRequests.length).toBeGreaterThanOrEqual(1);
      expect(rechazadaRequests[0].Status__c).toBe('success');

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 360000);

  it('[e2e] @C1313 IDI → Won → Cancelada', async () => {
    const report = new TestReport('E2E IDI — Won → Cancelada');
    try {
      const { oppId, quoteId, lineItemId } = await setupIDIQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Generada', report);
      await changeQuoteStatus(quoteId, 'won',      report);

      const wonRequests = await assertIntegrationSuccess(quoteId, 1, report, 'Verificar Integration_Request (won)');
      expect(wonRequests[0].Status__c).toBe('success');

      await changeQuoteStatus(quoteId, 'Cancelada', report);

      const quoteData = await getQuote(quoteId) as { IsCancelled__c?: boolean };
      report.step(
        'Verificar IsCancelled__c en Quote',
        { 'Quote Id': quoteId, 'IsCancelled__c': String(quoteData.IsCancelled__c) },
        quoteData.IsCancelled__c === true ? 'ok' : 'fail',
      );
      expect(quoteData.IsCancelled__c).toBe(true);

      const requests = await assertIntegrationSuccess(quoteId, 2, report, 'Verificar Integration_Request (Cancelada)');
      expect(requests.length).toBeGreaterThanOrEqual(2);
      expect(requests[0].Status__c).toBe('success');

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 360000);
});
