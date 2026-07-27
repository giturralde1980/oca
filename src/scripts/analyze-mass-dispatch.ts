/**
 * Corre DESPUÉS del despacho masivo de las ~260 citas de industria_citas_creadas.json.
 * Mide cómo respondió MuleSoft/las integraciones: por cada ServiceAppointment (y su
 * WorkOrder/Order relacionado) busca los Integration_Request__c generados, calcula tiempo de
 * procesamiento (CreatedDate → LastModifiedDate, que es cuando el callback de MuleSoft
 * actualiza Status__c) y desglosa éxitos/fallos/pendientes — para confirmar antes de dar por
 * bueno el proceso que no colapsó nada.
 *
 * Uso: TEST_ENV=qa DOTENV_CONFIG_PATH=.env.qa node -r dotenv/config node_modules/ts-node/dist/bin.js src/scripts/analyze-mass-dispatch.ts
 */
import { setupPactum } from '../helpers/request.helper';
import { sfQuery } from '../helpers/salesforce-query.helper';
import * as fs from 'fs';

interface CitaRow {
  ServiceAppointmentId: string;
  WorkOrderId: string;
  OrderId: string;
}

interface IntegrationRequest {
  Id: string;
  SF_Record_Id__c: string;
  SF_Record_Object__c: string;
  Status__c: string;
  SynchronizationError__c: string | null;
  Mulesoft_Transaction_Flow__c: string | null;
  CreatedDate: string;
  LastModifiedDate: string;
}

function extractFlowName(blob: string | null): string {
  if (!blob) return '(sin resolver aún)';
  const match = /"([A-Z_]+)":\s*\{\s*"(?:request|response)"/.exec(blob);
  return match ? match[1] : '(desconocido)';
}

async function main() {
  await setupPactum();

  const citas: CitaRow[] = JSON.parse(fs.readFileSync('reports/industria_citas_creadas.json', 'utf8'));
  console.log(`Analizando ${citas.length} citas...`);

  const saIds = citas.map(c => c.ServiceAppointmentId);
  const woIds = citas.map(c => c.WorkOrderId);
  const orderIds = citas.map(c => c.OrderId).filter(Boolean);
  const allIds = [...new Set([...saIds, ...woIds, ...orderIds])];

  // La URL con ~800 IDs en un solo IN clause supera el límite de tamaño de request (HTTP 431) —
  // se parte en lotes de 100 y se combinan los resultados.
  const CHUNK_SIZE = 100;
  const irs: IntegrationRequest[] = [];
  for (let i = 0; i < allIds.length; i += CHUNK_SIZE) {
    const chunk = allIds.slice(i, i + CHUNK_SIZE).map(id => `'${id}'`).join(',');
    const chunkResults = await sfQuery.query<IntegrationRequest>(
      `SELECT Id, SF_Record_Id__c, SF_Record_Object__c, Status__c, SynchronizationError__c,
              Mulesoft_Transaction_Flow__c, CreatedDate, LastModifiedDate
       FROM Integration_Request__c
       WHERE SF_Record_Id__c IN (${chunk})
       ORDER BY CreatedDate ASC`
    );
    irs.push(...chunkResults);
    console.log(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(allIds.length / CHUNK_SIZE)} — encontradas hasta ahora: ${irs.length}`);
  }
  console.log(`\nIntegration Requests encontradas: ${irs.length}\n`);

  const byStatus: Record<string, IntegrationRequest[]> = {};
  const processingTimesSec: number[] = [];
  const flowCounts: Record<string, number> = {};

  for (const ir of irs) {
    byStatus[ir.Status__c] = byStatus[ir.Status__c] || [];
    byStatus[ir.Status__c].push(ir);

    const flow = extractFlowName(ir.Mulesoft_Transaction_Flow__c);
    flowCounts[flow] = (flowCounts[flow] || 0) + 1;

    if (ir.Status__c !== 'pending') {
      const created = new Date(ir.CreatedDate).getTime();
      const modified = new Date(ir.LastModifiedDate).getTime();
      processingTimesSec.push((modified - created) / 1000);
    }
  }

  console.log('=== POR ESTADO ===');
  for (const [status, list] of Object.entries(byStatus)) {
    console.log(`${status}: ${list.length}`);
  }

  console.log('\n=== POR FLUJO MULESOFT ===');
  for (const [flow, count] of Object.entries(flowCounts)) {
    console.log(`${flow}: ${count}`);
  }

  if (processingTimesSec.length > 0) {
    const avg = processingTimesSec.reduce((a, b) => a + b, 0) / processingTimesSec.length;
    const max = Math.max(...processingTimesSec);
    const min = Math.min(...processingTimesSec);
    console.log('\n=== TIEMPOS DE PROCESAMIENTO (CreatedDate → última actualización) ===');
    console.log(`Promedio: ${avg.toFixed(1)}s | Mínimo: ${min.toFixed(1)}s | Máximo: ${max.toFixed(1)}s`);
  }

  const pending = byStatus['pending'] || [];
  if (pending.length > 0) {
    console.log(`\n⚠ ${pending.length} quedaron en 'pending' — revisar si es que MuleSoft no llegó a procesarlas (posible cuello de botella bajo carga).`);
  }

  const failed = byStatus['failed'] || [];
  if (failed.length > 0) {
    console.log(`\n=== ERRORES (${failed.length}) ===`);
    const errorCounts: Record<string, number> = {};
    for (const f of failed) {
      const key = (f.SynchronizationError__c || '').slice(0, 120);
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    }
    for (const [err, count] of Object.entries(errorCounts)) {
      console.log(`  x${count}: ${err}`);
    }
  }

  const citasSinIR = citas.filter(c =>
    !irs.some(ir => ir.SF_Record_Id__c === c.ServiceAppointmentId || ir.SF_Record_Id__c === c.WorkOrderId)
  );
  if (citasSinIR.length > 0) {
    console.log(`\n⚠ ${citasSinIR.length} citas NO generaron ningún Integration Request todavía (ni en SA ni en WorkOrder) — revisar si el despacho realmente les llegó.`);
  }

  fs.writeFileSync('reports/mass-dispatch-analysis.json', JSON.stringify({ irs, summary: { byStatus: Object.fromEntries(Object.entries(byStatus).map(([k, v]) => [k, v.length])), flowCounts, processingTimesSec }, citasSinIR }, null, 2));
  console.log('\nGuardado en reports/mass-dispatch-analysis.json');
}
main().catch(e => console.error('Fatal:', e.message));
