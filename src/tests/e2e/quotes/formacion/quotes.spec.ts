import { setupPactum }             from '../../../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../../../helpers/report.helper';
import {
  getSourceLineItem,
  setupFormacionQuote,
  changeQuoteStatus,
  assertQuoteStatus,
  SourceLineItem,
} from '../../../../helpers/steps/formacion-quote.steps';

const SOURCE_QUOTE_ID = '0Q0JW000008XWUL0A4';

describe.skip('Funcional — Quotes Formación', () => {
  let suite:    SuiteReport;
  let sourceLI: SourceLineItem;

  beforeAll(async () => {
    await setupPactum();
    suite    = new SuiteReport('E2E Quotes — Formación', 'Formación');
    sourceLI = await getSourceLineItem(SOURCE_QUOTE_ID);
  });

  afterAll(() => {
    const reportPath = suite.generate('reports');
    suite.serialize('reports/.tmp');
    console.log(`\n[suite] Reporte generado: ${reportPath}`);
  });

  it('[e2e] Formación → Presentada → Won → Aceptada', async () => {
    const report = new TestReport('E2E Formación — Won → Aceptada');
    try {
      const { oppId, quoteId, lineItemId } = await setupFormacionQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Presentada', report);
      await changeQuoteStatus(quoteId, 'won',        report);
      await changeQuoteStatus(quoteId, 'Aceptada',   report);

      await assertQuoteStatus(quoteId, 'Aceptada', report);

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 180000);

  it('[e2e] Formación → Presentada → Won → Rechazada', async () => {
    const report = new TestReport('E2E Formación — Won → Rechazada');
    try {
      const { oppId, quoteId, lineItemId } = await setupFormacionQuote(sourceLI, report);

      await changeQuoteStatus(quoteId, 'Presentada', report);
      await changeQuoteStatus(quoteId, 'won',        report);
      await changeQuoteStatus(quoteId, 'Rechazada',  report);

      await assertQuoteStatus(quoteId, 'Rechazada', report);

      expect(oppId).toBeTruthy();
      expect(quoteId).toBeTruthy();
      expect(lineItemId).toBeTruthy();
    } finally {
      report.finish();
      suite.add(report);
    }
  }, 180000);
});
