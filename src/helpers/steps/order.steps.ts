import pactum from 'pactum';
import { sfQuery } from '../salesforce-query.helper';
import { updateRecord } from '../salesforce-crud.helper';
import { TestReport } from '../report.helper';
import { getTestData } from '../../config/testdata';

interface StepsTestData { TECHNICIAN_ID: string }

const TECHNICIAN_ID = getTestData<StepsTestData>('steps').TECHNICIAN_ID; // German Iturralde

export async function patchOrderActivity(
  orderId:     string,
  activity:    string,
  actividadLN: string,
  activoId?:   string,
): Promise<void> {
  const body: Record<string, unknown> = { Activity__c: activity, Actividad_LN__c: actividadLN };
  if (activoId) body['Activo__c'] = activoId;
  await pactum.spec()
    .patch(`/sobjects/Order/${orderId}`)
    .withBody(body)
    .expectStatus(204);
}

export async function getOrder(id: string): Promise<Record<string, unknown>> {
  const order = await pactum.spec()
    .get(`/sobjects/Order/${id}`)
    .expectStatus(200)
    .returns('.');
  return order as Record<string, unknown>;
}

export async function queryOrderByQuoteId(quoteId: string): Promise<string | null> {
  const result = await pactum.spec()
    .get('/query')
    .withQueryParams('q', `SELECT Id FROM Order WHERE QuoteId = '${quoteId}' LIMIT 1`)
    .expectStatus(200)
    .returns('.');
  const records = (result as Record<string, unknown[]>)['records'];
  if (!records || records.length === 0) return null;
  return (records[0] as Record<string, string>)['Id'];
}

/** Polls until an Order linked to the given Quote exists and returns its Id. */
export async function waitForOrderFromQuote(
  quoteId: string,
  { waitMs = 2000, maxAttempts = 10 }: { waitMs?: number; maxAttempts?: number } = {},
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, waitMs));
    const orderId = await queryOrderByQuoteId(quoteId);
    if (orderId) return orderId;
  }
  throw new Error(`Order not created within ${(waitMs * maxAttempts) / 1000}s for Quote ${quoteId}`);
}

// Polls until Order exists and SAP sync confirmed: HasSyncError__c=false, SAPOrderNumber__c populated
export async function verifyOrderSyncedToSAP(
  quoteId: string,
  { initialDelayMs = 15000, intervalMs = 10000, timeoutMs = 90000 }: { initialDelayMs?: number; intervalMs?: number; timeoutMs?: number } = {},
): Promise<string> {
  if (initialDelayMs > 0) await new Promise(r => setTimeout(r, initialDelayMs));

  const start    = Date.now();
  const deadline = start + timeoutMs;
  let attempts   = 0;

  while (Date.now() < deadline) {
    attempts++;
    const orderId = await queryOrderByQuoteId(quoteId);

    if (!orderId) {
      console.log(`[SAP sync Order] attempt ${attempts} — Order not created yet`);
      await new Promise(r => setTimeout(r, intervalMs));
      continue;
    }

    const order       = await getOrder(orderId);
    const hasError    = order['HasSyncError__c'];
    const sapOrderNum = order['SAPOrderNumber__c'];
    const syncError   = order['SynchronizationError__c'];

    console.log(`[SAP sync Order] attempt ${attempts} — id: ${orderId}, HasSyncError__c: ${hasError}, SAPOrderNumber__c: ${sapOrderNum}`);

    if (syncError) throw new Error(`SAP sync error on Order ${orderId}: ${syncError}`);

    if (hasError === false && sapOrderNum) {
      console.log(`[SAP sync Order] confirmed after ${attempts} attempt(s) in ${((Date.now() - start) / 1000).toFixed(1)}s (+ ${initialDelayMs / 1000}s initial wait)`);
      return orderId;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Order for Quote ${quoteId} SAP sync did not complete within ${timeoutMs}ms`);
}

/** Polls an Order directly by its Id until SAP sync is confirmed. */
export async function verifyOrderSyncedByOrderId(
  orderId: string,
  { initialDelayMs = 15000, intervalMs = 10000, timeoutMs = 90000 }: { initialDelayMs?: number; intervalMs?: number; timeoutMs?: number } = {},
): Promise<void> {
  if (initialDelayMs > 0) await new Promise(r => setTimeout(r, initialDelayMs));

  const start    = Date.now();
  const deadline = start + timeoutMs;
  let attempts   = 0;

  while (Date.now() < deadline) {
    attempts++;
    const order      = await getOrder(orderId);
    const hasError   = order['HasSyncError__c'];
    const sapOrderNum = order['SAPOrderNumber__c'];
    const syncError  = order['SynchronizationError__c'];

    console.log(`[SAP sync Order] attempt ${attempts} — id: ${orderId}, HasSyncError__c: ${hasError}, SAPOrderNumber__c: ${sapOrderNum}`);

    if (syncError) throw new Error(`SAP sync error on Order ${orderId}: ${syncError}`);

    if (hasError === false && sapOrderNum) {
      console.log(`[SAP sync Order] confirmed after ${attempts} attempt(s) in ${((Date.now() - start) / 1000).toFixed(1)}s (+ ${initialDelayMs / 1000}s initial wait)`);
      return;
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Order ${orderId} SAP sync did not complete within ${timeoutMs}ms`);
}

/** Queries for the WorkOrder linked to an Order via the custom Order__c field. */
export async function queryWorkOrderByOrderId(orderId: string): Promise<string | null> {
  const [wo] = await sfQuery.query<{ Id: string }>(
    `SELECT Id FROM WorkOrder WHERE Order__c = '${orderId}' LIMIT 1`
  );
  return wo?.Id ?? null;
}

/** Polls until the WorkOrder synced from an Order shows up (MA/INS Order→WorkOrder sync is async). */
export async function waitForWorkOrderByOrderId(
  orderId: string,
  { maxAttempts = 10, delayMs = 5000 }: { maxAttempts?: number; delayMs?: number } = {},
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const workOrderId = await queryWorkOrderByOrderId(orderId);
    if (workOrderId) return workOrderId;
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`WorkOrder not synced within ${(maxAttempts * delayMs) / 1000}s for Order ${orderId}`);
}

export async function getWorkOrder(id: string): Promise<Record<string, unknown>> {
  const wo = await pactum.spec()
    .get(`/sobjects/WorkOrder/${id}`)
    .expectStatus(200)
    .returns('.');
  return wo as Record<string, unknown>;
}

export async function createWorkOrder(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/WorkOrder/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

/** Counts child WorkOrders (ParentWorkOrderId) — there is no rollup field for this on WorkOrder. */
export async function countChildWorkOrders(parentWorkOrderId: string): Promise<number> {
  const children = await sfQuery.query<{ Id: string }>(
    `SELECT Id FROM WorkOrder WHERE ParentWorkOrderId = '${parentWorkOrderId}'`,
  );
  return children.length;
}

// Manually creates an additional ServiceAppointment under the same WorkOrder — only
// EarliestStartTime and DueDate are required on create. Used to simulate a WorkOrder
// with appointments in different states (the auto-created SA is always the first one).
export async function createServiceAppointment(payload: Record<string, unknown>): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/ServiceAppointment/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

interface ServiceAppointmentResult {
  Id:     string;
  Status: string;
}

/**
 * Polls for a ServiceAppointment linked to the WorkOrder of the given Order.
 * SA is created synchronously with the WorkOrder, so it's normally already present.
 */
export async function assertServiceAppointmentForOrder(
  orderId:     string,
  report:      TestReport,
  maxAttempts = 10,
  delayMs     = 3000,
): Promise<ServiceAppointmentResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const workOrderId = await queryWorkOrderByOrderId(orderId);
    if (workOrderId) {
      const [sa] = await sfQuery.query<ServiceAppointmentResult>(
        `SELECT Id, Status FROM ServiceAppointment WHERE ParentRecordId = '${workOrderId}' LIMIT 1`
      );
      if (sa) {
        report.step(
          'Verificar ServiceAppointment (WorkOrder)',
          { 'Order Id': orderId, 'WorkOrder Id': workOrderId, 'SA Id': sa.Id, 'Status': sa.Status },
          'ok',
        );
        return sa;
      }
    }
    console.log(`[e2e]   Esperar SA — intento ${attempt}/${maxAttempts}`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  report.step(
    'Verificar ServiceAppointment (WorkOrder)',
    { 'Order Id': orderId, 'SA Id': '(no encontrado)' },
    'fail',
  );
  throw new Error(`No ServiceAppointment found for Order ${orderId} after ${maxAttempts} attempts`);
}

/**
 * Schedules a ServiceAppointment: sets SchedStartTime to tomorrow 09:00,
 * SchedEndTime to +15 min, and assigns the internal technician.
 */
export async function scheduleServiceAppointment(
  saId:   string,
  report: TestReport,
): Promise<{ schedStartTime: string; schedEndTime: string }> {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 15 * 60 * 1000);

  const schedStartTime = start.toISOString();
  const schedEndTime   = end.toISOString();

  await updateRecord('ServiceAppointment', saId, {
    Status:                        'Scheduled',
    SchedStartTime:                schedStartTime,
    SchedEndTime:                  schedEndTime,
    AssignedInternalTechnician__c: TECHNICIAN_ID,
    DT_StartMovility__c:           schedStartTime,
  });

  report.step(
    'Programar ServiceAppointment',
    {
      'SA Id':                          saId,
      'Status':                         'Scheduled',
      'SchedStartTime':                 schedStartTime,
      'SchedEndTime':                   schedEndTime,
      'AssignedInternalTechnician__c':  TECHNICIAN_ID,
    },
    'ok',
  );

  // AssignedInternalTechnician__c es un campo custom — no crea la asignación real de Field
  // Service. El AssignedResource (objeto estándar ServiceAppointmentId+ServiceResourceId) es
  // lo que el motor de despacho/Gantt de FSL realmente lee, así que se crea aparte con el mismo técnico.
  // NBK_AssignedResourceTrigger (afterInsert) actualiza la WorkOrder relacionada — la misma que
  // el updateRecord de arriba acaba de tocar — y puede chocar con "unable to obtain exclusive
  // access to this record" (row lock de Salesforce) si el insert llega antes de que esa
  // transacción libere el lock. Reproduce incluso en una corrida sola, no es solo por paralelismo.
  // Reintenta con backoff, que es la recomendación estándar de Salesforce para este error.
  let assignedResource: string | undefined;
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      assignedResource = await pactum.spec()
        .post('/sobjects/AssignedResource/')
        .withBody({ ServiceAppointmentId: saId, ServiceResourceId: TECHNICIAN_ID })
        .expectStatus(201)
        .returns('id') as string;
      break;
    } catch (e) {
      const message = (e as Error).message;
      const isLockContention = message.includes('unable to obtain exclusive access');
      if (!isLockContention || attempt === maxAttempts) throw e;
      const delayMs = attempt * 2000;
      console.log(`[AssignedResource] lock contention, reintento ${attempt}/${maxAttempts} en ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  report.step('Crear AssignedResource', { 'SA Id': saId, 'ServiceResourceId': TECHNICIAN_ID, 'AssignedResource Id': assignedResource! }, 'ok');

  return { schedStartTime, schedEndTime };
}

/** Updates ServiceAppointment Status to Dispatched. */
export async function dispatchServiceAppointment(
  saId:   string,
  report: TestReport,
): Promise<void> {
  await updateRecord('ServiceAppointment', saId, { Status: 'Dispatched' });
  report.step('Despachar ServiceAppointment', { 'SA Id': saId, 'Status': 'Dispatched' }, 'ok');
}

/**
 * Closes the SA (dispatched → in_progress → 5) so its linked Asset is no longer
 * blocked by SF validation rules. Without this, each test run leaves the asset
 * permanently locked and subsequent runs fail when assigning the same asset.
 * Status '5' is the terminal/completed state in this org (no English label).
 */
export async function releaseServiceAppointment(saId: string): Promise<void> {
  await updateRecord('ServiceAppointment', saId, { Status: 'in_progress' });
  await updateRecord('ServiceAppointment', saId, { Status: '5' });
}

/** Sets Technician__c (and optionally Activo__c) on the WorkOrder. */
export async function assignTechnicianToWorkOrder(
  workOrderId: string,
  report:      TestReport,
  activoId?:   string,
): Promise<void> {
  const body: Record<string, unknown> = { Technician__c: TECHNICIAN_ID };
  if (activoId) body['AssetId'] = activoId;
  await updateRecord('WorkOrder', workOrderId, body);
  report.step(
    'Asignar Technician__c en WorkOrder',
    { 'WorkOrder Id': workOrderId, 'Technician__c': TECHNICIAN_ID, ...(activoId ? { 'AssetId': activoId } : {}) },
    'ok',
  );
}

/**
 * Finalizes a WorkOrder with 'Requiere RTE', triggering the WO_ApprovalProcess Flow
 * (found via Tooling API — not documented anywhere else) that submits the 'RTE Approval'
 * process. That Flow's entry criteria is RTERequired__c=true AND Status='4' (Complete), but
 * NBK_WorkOrderTrigger also cascades any WO status change onto its ServiceAppointment, and a
 * Validation Rule on ServiceAppointment rejects that cascade unless AssignedInternalTechnician__c
 * or AssignedFreelance__c is already set — hence AssignedInspector__c must be set on the WO
 * *first*, in a separate update, before flipping RTERequired__c/Status.
 */
export async function submitWorkOrderForRTE(workOrderId: string, report: TestReport): Promise<void> {
  await updateRecord('WorkOrder', workOrderId, { AssignedInspector__c: TECHNICIAN_ID });
  report.step('Asignar AssignedInspector__c en la OT', { 'WorkOrder Id': workOrderId, 'AssignedInspector__c': TECHNICIAN_ID }, 'ok');

  await updateRecord('WorkOrder', workOrderId, { RTERequired__c: true, Status: '4' });
  report.step('Finalizar OT marcando \'Requiere RTE\' (RTERequired__c=true, Status=Complete)', { 'WorkOrder Id': workOrderId }, 'ok');
}

/**
 * Finalizes a WorkOrder with the full 'Inspection Data' section filled in, required before
 * OrderItem.Waybilled__c=true is accepted at the line level (found by reading
 * NBK_OrderItemTriggerController.beforeUpdate → NBK_OrderItemTriggerHelper.validationAlbaranado
 * → checkRequiredFields — not in any Validation Rule, Custom Label, or Flow, so not discoverable
 * by any of those searches). For business lines NOT in
 * NBK_OrderItemTriggerHelper's SPECIAL_WAYBILL_VALIDATION_BUSINESS_LINES set ({MC, SI, PR}) —
 * which includes RG — the required fields are SchedEndTime__c, PlannedStartDate__c, StartDate,
 * EndDate, AssignedInspector__c and InspectionResult__c, on top of the Asset/justification
 * fields already needed just to reach Status='4' (see submitWorkOrderForRTE's note).
 */
export async function finalizeWorkOrderWithInspectionData(
  workOrderId: string,
  assetId: string,
  report: TestReport,
): Promise<void> {
  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 60000);

  await updateRecord('WorkOrder', workOrderId, {
    AssignedInspector__c: TECHNICIAN_ID,
    AssetId: assetId,
    Justificaci_n_del_cierre_manual__c: 'E2E — cierre manual',
    InspectionResult__c: '1',
    StartDate: startDate.toISOString(),
    EndDate: now.toISOString(),
    SchedEndTime__c: now.toISOString(),
    PlannedStartDate__c: startDate.toISOString(),
  });
  report.step('Completar datos de inspección en la OT', { 'WorkOrder Id': workOrderId, 'InspectionResult__c': '1' }, 'ok');

  await updateRecord('WorkOrder', workOrderId, { Status: '4' });
  report.step('Finalizar OT (Status=Complete)', { 'WorkOrder Id': workOrderId }, 'ok');
}
