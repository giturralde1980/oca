import { sfQuery }    from '../salesforce-query.helper';
import { updateRecord } from '../salesforce-crud.helper';
import { getQuote, updateQuoteStatus } from './quote.steps';
import { TestReport }  from '../report.helper';

export interface SourceLineItem {
  PricebookEntryId: string;
  UnitPrice:        number;
  Quantity:         number;
  SelectedPrice__c: number;
  Activity__c:      string;
  Subactivity__c:   string;
  Holder__c:        string;
  Asset__c:         string;
  Actividad_LN__c:  string;
  Discount__c:      number;
  Subtotal__c:      number;
  Taxes__c:         number;
  TaxesTotal__c:    number;
  Fee__c:           number;
  Description:      string;
}

export interface IntegrationRequest {
  Id:              string;
  SF_Record_Id__c: string;
  Status__c:       string;
}

export async function getSourceLineItem(sourceQuoteId: string): Promise<SourceLineItem> {
  const [sourceLI] = await sfQuery.query<SourceLineItem>(
    `SELECT PricebookEntryId, UnitPrice, Quantity, SelectedPrice__c,
            Activity__c, Subactivity__c, Holder__c, Asset__c, Actividad_LN__c,
            Discount__c, Subtotal__c, Taxes__c, TaxesTotal__c, Fee__c, Description
     FROM QuoteLineItem
     WHERE QuoteId = '${sourceQuoteId}'
     LIMIT 1`
  );
  return sourceLI;
}

export async function changeQuoteStatus(
  quoteId:            string,
  status:             string,
  report:             TestReport,
  rejectionReason     = 'TODO_REJECTION_REASON',
  cancellationReason  = 'TODO_CANCELLATION_REASON',
): Promise<void> {
  if (status === 'Generada') {
    await updateQuoteStatus(quoteId, status);
  } else if (status === 'Rechazada') {
    await updateRecord('Quote', quoteId, { Status: status, RejectionReason__c: rejectionReason, FlowBypassVR__c: true });
    report.step(`Cambiar estado Quote → ${status}`, { 'Quote Id': quoteId, 'Status': status, 'RejectionReason__c': rejectionReason });
    return;
  } else if (status === 'Cancelada') {
    await updateRecord('Quote', quoteId, { Status: 'Rechazada', IsCancelled__c: true, Reason_for_cancellation__c: cancellationReason, FlowBypassVR__c: true });
    report.step('Cambiar estado Quote → Cancelada', { 'Quote Id': quoteId, 'Status': 'Rechazada', 'IsCancelled__c': 'true', 'Reason_for_cancellation__c': cancellationReason });
    return;
  } else {
    // won triggers Order creation + SAP integration synchronously; needs extra timeout
    const timeoutMs = status === 'won' ? 60000 : 30000;
    await updateRecord('Quote', quoteId, { Status: status }, timeoutMs);
  }
  report.step(`Cambiar estado Quote → ${status}`, { 'Quote Id': quoteId, 'Status': status });
}

export async function assertIntegrationSuccess(
  recordId:    string,
  minCount:    number,
  report:      TestReport,
  label:       string,
  maxAttempts = 24,
  delayMs     = 5000,
): Promise<IntegrationRequest[]> {
  let records: IntegrationRequest[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    records = await sfQuery.query<IntegrationRequest>(
      `SELECT Id, SF_Record_Id__c, Status__c, CreatedDate
       FROM Integration_Request__c
       WHERE SF_Record_Id__c = '${recordId}'
       ORDER BY CreatedDate DESC`
    );
    if (records.length >= minCount && records[0]?.Status__c === 'success') break;
    console.log(`[e2e]   ${label} — intento ${attempt}/${maxAttempts}, encontrados: ${records.length}`);
    await new Promise(r => setTimeout(r, delayMs));
  }

  const latest = records[0];
  report.step(
    label,
    { 'Total registros': String(records.length), 'Integration Request Id': latest?.Id, 'SF_Record_Id__c': recordId, 'Status__c': latest?.Status__c },
    records.length >= minCount && latest?.Status__c === 'success' ? 'ok' : 'fail',
  );

  return records;
}

export async function assertSAPReferenceOrderNumber(
  quoteId:     string,
  report:      TestReport,
  maxAttempts = 24,
  delayMs     = 5000,
): Promise<string> {
  let sapRef = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const [quote] = await sfQuery.query<{ SAPReferenceOrderNumber__c: string }>(
      `SELECT SAPReferenceOrderNumber__c FROM Quote WHERE Id = '${quoteId}' LIMIT 1`
    );
    sapRef = quote?.SAPReferenceOrderNumber__c ?? '';
    if (sapRef) break;
    console.log(`[e2e]   Esperar SAPReferenceOrderNumber__c — intento ${attempt}/${maxAttempts}`);
    await new Promise(r => setTimeout(r, delayMs));
  }

  report.step(
    'Verificar SAPReferenceOrderNumber__c en Quote',
    { 'Quote Id': quoteId, 'SAPReferenceOrderNumber__c': sapRef || '(vacío)' },
    sapRef ? 'ok' : 'fail',
  );

  return sapRef;
}

export async function assertQuoteURL(quoteId: string, report: TestReport): Promise<void> {
  const quoteData = await getQuote(quoteId) as { QuoteURL__c?: string };
  const quoteUrl  = quoteData.QuoteURL__c;
  const isValid   = !!quoteUrl && /^https?:\/\/.+\..+/.test(quoteUrl);

  report.step(
    'Verificar QuoteURL__c',
    { 'Quote Id': quoteId, 'QuoteURL__c': quoteUrl ?? '(vacío)' },
    isValid ? 'ok' : 'fail',
  );
}
