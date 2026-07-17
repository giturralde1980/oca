'use strict';

const https = require('https');
const { URL } = require('url');
const fs   = require('fs');
const path = require('path');

const STEP_SUMMARY_FILE = path.join(process.cwd(), 'reports', '.tmp', 'testrail-comments.jsonl');

const TESTRAIL_SUITE_ID           = 6;
const TESTRAIL_PLAN_ID            = 113; // "UAT Base" plan — https://oca.testrail.io/index.php?/plans/view/113
const TESTRAIL_REPORT_TEMPLATE_ID = 1;   // "Plan (Summary)" report, scoped to plan 113

const CASE_MAP = {
  // Sección "Integracion" (creada dentro de Test Cases, suite Master)
  'IDI → Won → Firmada':                                             1311,
  'IDI → Generada → Won → Rechazada':                                1312,
  'IDI → Won → Cancelada':                                           1313,
  'Industria → Won → Order SAP → Service Appointment → Dispatched':  1314,

  // UAT Base (C514-C640)
  'Verificar que se puede crear un candidato': 514,
  'Verificar que al convertir un candidato se generan correctamente la cuenta, el contacto y la oportunidad': 515,
  'Verificar que se puede crear una cuenta de tipo Cliente con los campos necesarios para sincronizar con SAP': 516,
  'Verificar que un contacto nuevo sincroniza correctamente con SAP tras sincronizarse la cuenta': 517,
  'Verificar que se puede crear un perfil de facturación vinculado a la cuenta y al contacto, y que sincroniza correctamente': 518,
  'Verificar que se puede crear un activo de tipo Centro': 519,
  'Verificar que se puede crear un activo de tipo Centro Internacional': 520,
  'Verificar que se puede crear un activo de tipo Instalación': 521,
  'Verificar que se puede crear un activo de tipo Instalación vinculado a un centro (jerarquía de activos)': 522,
  'Verificar que se puede crear una cuenta de tipo Proveedor con los campos necesarios para sincronizar con SAP': 523,
  'Verificar que se puede crear un perfil de facturación para una cuenta Proveedor y darla de alta en una nueva sociedad': 524,
  'Verificar que se puede crear una cuenta de tipo Explotación': 525,
  'Verificar que se puede crear una cuenta de tipo Delegación': 526,
  'Verificar que al crear una oportunidad se genera correctamente el contrato marco relacionado con sus campos autocompletados': 527,
  'Verificar que se pueden configurar en el contrato marco varios productos repetidos, tanto principales como complementos': 528,
  'Verificar que se puede generar el documento del contrato marco': 529,
  "Verificar que al cambiar el contrato marco a estado 'Generado' se lanza el proceso de aprobación correctamente": 530,
  'Verificar que al aceptar el contrato marco el aprobador, su estado cambia correctamente': 531,
  'Verificar que al rechazar el contrato marco el aprobador, su estado cambia correctamente': 532,
  'Verificar que se puede recuperar un proceso de aprobación de contrato marco solicitado': 533,
  'Verificar que se puede cerrar un contrato marco como ganado': 534,
  'Verificar que se puede clonar un contrato marco': 535,
  'Verificar que se puede versionar un contrato marco': 536,
  'Verificar que se puede crear una oferta comercial con impuestos no exentos y sus campos se autocompletan correctamente': 537,
  'Verificar que al configurar la oferta comercial se asignan correctamente los impuestos según el activo vinculado a cada línea': 538,
  'Verificar que se puede generar el documento de la oferta comercial (Construcción)': 539,
  'Verificar que se puede generar el documento de la oferta comercial': 540,
  'Verificar que se generan correctamente los pedidos de compra al añadir productos de distintos catálogos de compra en la oferta comercial': 541,
  "Verificar que al cambiar la oferta comercial a estado 'Generado' se lanza el proceso de aprobación según las condiciones de precio o descuento": 542,
  'Verificar que la oferta comercial se asigna automáticamente al aprobador correspondiente según el precio total o el descuento máximo': 543,
  'Verificar que al aceptar la oferta comercial el aprobador, su estado cambia correctamente': 544,
  'Verificar que al rechazar la oferta comercial el aprobador, su estado cambia correctamente': 545,
  'Verificar que se puede recuperar un proceso de aprobación de oferta comercial solicitado': 546,
  "Verificar que al completar la URL del documento y pasar la oferta a 'Enviar documento' se envía el transaccional al prescriptor": 547,
  'Verificar que se puede crear una oferta comercial con impuestos exentos y sus campos se autocompletan correctamente': 548,
  'Verificar que la columna de tasas se rellena al añadir un activo ubicado en una región con tasa': 549,
  'Verificar que la columna de tasas se rellena al crear un producto de una delegación con tasas': 550,
  'Verificar que la asignación de impuestos es del 0% en todas las líneas de oferta cuando corresponda': 551,
  "Verificar que añadir complementos sin el check 'Add duration' no modifica el tiempo estimado de las OTs relacionadas": 552,
  "Verificar que añadir complementos con el check 'Add duration' modifica el tiempo estimado de las OTs relacionadas": 553,
  'Verificar que se puede clonar una oferta comercial': 554,
  'Verificar que se puede versionar una oferta comercial': 555,
  'Verificar que se lanza el proceso de aprobación por RTO al aprobar una oferta que requiere revisión': 556,
  'Verificar que al aceptar el RTO el aprobador se actualizan correctamente los campos y se notifica al comercial': 557,
  'Verificar que al rechazar el RTO el aprobador se actualizan correctamente los campos correspondientes': 558,
  'Verificar que al aceptar la oferta comercial se genera correctamente el pedido con sus líneas y OTs': 559,
  'Verificar que se generan los parámetros correspondientes al incluir un paquete de productos vinculado a un activo': 560,
  'Verificar que se elimina el parámetro de instalación al eliminar un paquete que lo genera, si no está asociado a otro pedido': 561,
  'Verificar que se gestionan correctamente los parámetros de instalación al cambiar el activo de un paquete': 562,
  'Verificar que se gestionan correctamente los parámetros de instalación al eliminar el activo asociado a un paquete': 563,
  'Verificar que al reducir la cantidad de un complemento que genera OT se recalcula el precio y las OTs sobrantes deben cancelarse manualmente': 564,
  'Verificar que al aumentar la cantidad de un complemento que genera OT se recalcula el precio y se genera una nueva OT': 565,
  'Verificar que se puede configurar un pedido de venta con productos del catálogo y del contrato marco correspondiente': 566,
  'Verificar que se puede crear un pedido de compra relacionado a un pedido de venta': 567,
  'Verificar que se pueden crear líneas de pedido de compra para líneas de pedido de venta con distintos precios': 568,
  'Verificar que se puede crear un segundo pedido de compra para otro proveedor relacionado al mismo pedido de venta': 569,
  'Verificar que solo se muestran las líneas de pedido de venta aún no albaranadas al generar líneas de pedido de compra': 570,
  'Verificar que las líneas de pedido de compra se integran correctamente en SAP': 571,
  'Verificar que al modificar el precio de una línea de pedido de compra se actualiza correctamente en SAP': 572,
  'Verificar que se puede configurar un pedido de compra filtrando productos desde el selector de pedido de venta': 573,
  'Verificar que se puede clonar un pedido de venta con sus líneas y su sincronización con SAP': 574,
  "Verificar que un pedido de venta tipo ZSER con 'Pedido de tramitación' no genera OTs y se albarana automáticamente": 575,
  'Verificar que un pedido de venta tipo ZOBR para productos EICIs genera correctamente el pedido y sus 2 OTs': 576,
  "Verificar que al finalizar una OT con 'Requiere RTE' se lanza el proceso de aprobación al responsable de la delegación": 577,
  'Verificar que al aceptar el RTE el aprobador se actualizan correctamente los campos correspondientes': 578,
  'Verificar que al rechazar el RTE el aprobador se actualizan correctamente los campos correspondientes': 579,
  'Verificar que al finalizar una OT se albarana automáticamente la línea de pedido': 580,
  'Verificar que se puede desalbaranar manualmente una línea de pedido': 581,
  'Verificar que al modificar el importe de una línea de pedido se lanza un nuevo albaranado': 582,
  'Verificar que al finalizar una OT se puede albaranar manualmente la línea de pedido': 583,
  'Verificar que al finalizar una OT se albarana automáticamente el hito correspondiente': 584,
  'Verificar que al finalizar una OT se puede albaranar manualmente el hito correspondiente': 585,
  'Verificar que se pueden crear OTs hijas vinculadas a una OT principal y se actualiza su conteo': 586,
  'Verificar que se puede duplicar una cita de servicio y su estado se ajusta correctamente': 587,
  'Verificar que al crear una segunda cita de servicio, el estado de la OT principal permanece inalterado': 588,
  'Verificar que el estado de la OT principal permanece inalterado al despachar una cita si existen otras citas en estados distintos': 589,
  "Verificar que el estado de la OT principal cambia a 'Programada' al despachar la única cita o todas las citas relacionadas": 590,
  'Verificar que al reprogramar una cita de servicio se actualiza la hora y se notifica al técnico y al cliente': 591,
  'Verificar que el estado de la OT principal permanece inalterado al finalizar una cita si existen otras citas en estados distintos': 592,
  "Verificar que el estado de la OT principal cambia a 'Finalizada' al finalizar la única cita o todas las citas relacionadas": 593,
  "Verificar que se activa la consola de generación manual de segundas visitas al finalizar una OT con resultado 'Grave' o 'Crítico'": 594,
  "Verificar que se generan automáticamente las segundas visitas dos días después de un resultado 'Grave'": 595,
  'Verificar que la fecha de próxima inspección no cambia y se envía el certificado por correo al finalizar un trabajo sin periodicidad de inspección': 596,
  'Verificar que la fecha de próxima inspección se actualiza correctamente y se envía el transaccional de caducidad al finalizar un trabajo con periodicidad de inspección': 597,
  'Verificar que se pueden programar trabajos desde la consola custom de programación': 598,
  'Verificar que se generan correctamente las N OTs con sus hitos al crear líneas de pedido con complemento en un pedido tipo ZOBR': 599,
  "Verificar que aparece el botón 'Sincronizar' en la línea de pedido para sincronizar los pesos de los hitos": 600,
  'Verificar que se impide sincronizar los pesos de los hitos si la suma de porcentajes de producción no es 100%': 601,
  'Verificar que se pueden sincronizar con SAP los pesos de los hitos cuando la suma de porcentajes es 100%': 602,
  'Verificar que el menú de albaranado de la OT solo aparece cuando la sincronización de hitos ha sido exitosa': 603,
  'Verificar que se impide albaranar las OTs al modificar el peso de alguna de ellas hasta volver a sincronizar': 604,
  'Verificar que se puede albaranar una OT correctamente': 605,
  'Verificar que se impide modificar el porcentaje de producción de una OT ya albaranada': 606,
  'Verificar que se puede desalbaranar una OT correctamente': 607,
  "Verificar que el estado de la línea de pedido cambia a 'Realizado' al albaranar todas sus OTs": 608,
  'Verificar que el estado de la línea de pedido se actualiza correctamente al desalbaranar una OT ya albaranada': 609,
  'Verificar que se puede albaranar una línea comercial vinculada a una OT de visita finalizada': 610,
  'Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una línea de pedido': 611,
  'Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una orden de trabajo': 612,
  'Verificar que se puede generar una factura desde la pantalla de facturación manual del pedido de venta': 613,
  'Verificar que la factura generada se sincroniza correctamente con SAP': 614,
  'Verificar que se muestra un único plan de facturación al 100% en pedidos tipo ZOBR': 615,
  'Verificar que se impide crear planes de facturación que no sumen un 100%': 616,
  'Verificar que se puede facturar seleccionando solo algunos planes de facturación, calculando el importe correctamente': 617,
  'Verificar que se puede generar una proforma sincronizada con SAP': 618,
  'Verificar que se puede generar directamente una factura emitida sincronizada con SAP': 619,
  'Verificar que se puede generar una factura emitida a partir de una proforma': 620,
  'Verificar que se puede abonar una factura emitida con facturación por hitos y se liberan los planes de facturación': 621,
  'Verificar que se pueden facturar planes que estaban en una factura ya abonada': 622,
  'Verificar que se pueden reutilizar planes de facturación de una proforma que fue borrada': 623,
  "Verificar que una factura sin cobro cambia a estado 'Impagada' y se envía el transaccional correspondiente": 624,
  "Verificar que el estado de una factura cambia a 'Cobrado' al contabilizar el cobro en SAP": 625,
  "Verificar que el estado de una factura cambia a 'Impagada' al modificar su fecha de vencimiento": 626,
  'Verificar que se genera la notificación de facturación electrónica al facturar una cuenta con ese check marcado': 627,
  'Verificar que se puede realizar el proceso de refacturación entre sociedades': 628,
  'Verificar que se pueden crear recursos de servicio con sus skills correspondientes': 629,
  'Verificar que se pueden crear activos de tipo equipo vinculados a magnitudes y CVM': 630,
  'Verificar que se pueden crear informes de desviación, no conformidades y acciones preventivas o correctivas': 631,
  "Verificar que se envía el transaccional al prescriptor al cambiar la oferta comercial a 'Enviar documento'": 632,
  'Verificar que se envía el transaccional al técnico interno 2 días antes de la cita programada': 633,
  'Verificar que se envía el transaccional al titular y al prescriptor 2 días antes de la cita programada': 634,
  'Verificar que se envía el transaccional al técnico interno cuando quedan menos de 2 días para la cita': 635,
  'Verificar que se envía el transaccional al titular y al prescriptor cuando quedan menos de 2 días para la cita': 636,
  'Verificar que se envía el informe al cliente 48 horas después de finalizar la OT': 637,
  'Verificar que se envía el transaccional al contacto responsable de pago 24 horas después de emitir la factura': 638,
  'Verificar que se envía el transaccional al contacto responsable de pago 7 días después de vencer una factura impagada': 639,
  'Verificar que se envía el transaccional al titular y al prescriptor 6 meses antes de la próxima inspección': 640,
};

// TestRail default status IDs: 1 Passed, 2 Blocked, 3 Untested, 4 Retest, 5 Failed.
// BLOCKED is used for Jest's `it.todo` — tests confirmed architecturally unreachable via REST
// (e.g. logic that only lives behind an Aura/LWC remote-action), as opposed to SKIPPED
// (`it.skip`, i.e. "not automated yet" without a confirmed hard blocker).
const STATUS = { PASSED: 1, BLOCKED: 2, FAILED: 5, SKIPPED: 4 };

function trRequest(method, path, body) {
  const baseUrl  = process.env.TESTRAIL_URL;
  const user     = process.env.TESTRAIL_USER;
  const apiKey   = process.env.TESTRAIL_API_KEY;
  const token    = Buffer.from(`${user}:${apiKey}`).toString('base64');

  return new Promise((resolve, reject) => {
    const url  = new URL(`/index.php?/api/v2/${path}`, baseUrl);
    const data = body ? JSON.stringify(body) : undefined;
    const req  = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method,
        headers: {
          Authorization:  `Basic ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          if (res.statusCode < 300) resolve(d ? JSON.parse(d) : {});
          else reject(new Error(`TestRail ${method} ${path} → HTTP ${res.statusCode}: ${d}`));
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

class TestRailReporter {
  constructor(_globalConfig, _options) {
    this.runId   = null;
    this.enabled = !!(
      process.env.TESTRAIL_URL &&
      process.env.TESTRAIL_USER &&
      process.env.TESTRAIL_API_KEY
    );
  }

  async onRunStart() {
    if (!this.enabled) return;
    // Fresh start each run — see the comment on STEP_SUMMARY_FILE / onTestResult below.
    try { fs.rmSync(STEP_SUMMARY_FILE, { force: true }); } catch { /* ignore */ }
    try {
      const env  = process.env.TEST_ENV ?? 'qa';
      const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
      // Adds the run as an entry inside the "UAT Base" plan (113) instead of a standalone run,
      // so every execution stays linked to https://oca.testrail.io/index.php?/plans/view/113
      const entry = await trRequest('POST', `add_plan_entry/${TESTRAIL_PLAN_ID}`, {
        suite_id:    TESTRAIL_SUITE_ID,
        name:        `UAT Salesforce QA — ${env.toUpperCase()} — ${date}`,
        description: `Ejecución automática — ${new Date().toISOString()}`,
        case_ids:    Object.values(CASE_MAP),
        include_all: false,
      });
      const run  = entry.runs && entry.runs[0];
      this.runId = run && run.id;
      console.log(`\n[TestRail] Run creado dentro del plan ${TESTRAIL_PLAN_ID}: https://oca.testrail.io/index.php?/runs/view/${this.runId}&plan_id=${TESTRAIL_PLAN_ID}\n`);
    } catch (err) {
      console.warn('[TestRail] No se pudo crear el run en el plan:', err.message);
    }
  }

  async onTestResult(_test, result) {
    if (!this.enabled || !this.runId) return;

    // Tests run in a worker process — Jest's `testResult.console` (which would let a reporter
    // read a test's console.log output) comes back undefined in this project's setup, so
    // TestReport#logForTestRail writes to a shared JSONL file instead (see report.helper.ts).
    // TestReport titles never match the Jest `it()` title (they're a separate free-text
    // description, e.g. "C556 — RTORegl__c=true..."), so correlate by the "C<number>" case id
    // embedded in both instead of exact text.
    const stepSummaryByCaseId = {};
    try {
      const lines = fs.readFileSync(STEP_SUMMARY_FILE, 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        const { title, comment } = JSON.parse(line);
        const match = /^C(\d+)/.exec(title);
        if (match) stepSummaryByCaseId[match[1]] = comment;
      }
    } catch { /* file not created yet — no summaries logged so far */ }

    for (const t of result.testResults) {
      // Strip everything from the first " — " onward — every it.todo reason (NO AUTOMATIZABLE,
      // BLOQUEADO POR BUG REAL EN QA, DATOS MAESTROS..., NO CONFIRMADO POR REST, NO EJECUTABLE EN
      // QA, etc.) follows "<título> — <MOTIVO>: <detalle>", so matching by keyword was missing
      // titles and leaving them Untested in TestRail instead of Blocked.
      const title  = t.title
        .replace(/^\[e2e\]\s+@C\d+\s+/, '')
        .replace(/\s+—\s+.*$/, '');
      const caseId = CASE_MAP[title];
      if (!caseId) continue;

      const status  = t.status === 'passed'  ? STATUS.PASSED
                    : t.status === 'todo'    ? STATUS.BLOCKED
                    : t.status === 'pending' ? STATUS.SKIPPED
                    : STATUS.FAILED;

      const comment = t.status === 'failed'
        ? t.failureMessages.join('\n').slice(0, 1000)
        : stepSummaryByCaseId[caseId] || undefined;

      try {
        await trRequest('POST', `add_result_for_case/${this.runId}/${caseId}`, { status_id: status, comment });
      } catch (err) {
        console.warn(`[TestRail] Error reportando C${caseId}:`, err.message);
      }
    }
  }

  async onRunComplete(_contexts, results) {
    if (!this.enabled || !this.runId) return;

    // A run that belongs to a plan can't be closed on its own (close_run/{id} → 403), and
    // TestRail's API has no "close this one entry" method — only close_plan/{id}, which closes
    // the whole plan and would block future executions from being added to it. Since the plan
    // is meant to accumulate every UAT Base run over time, we intentionally leave it open and
    // just report the counts + generate the summary report.
    const { numPassedTests, numFailedTests } = results;
    console.log(`\n[TestRail] Run finalizado — ✅ ${numPassedTests} passed, ❌ ${numFailedTests} failed\n`);

    // Report generation via run_report/{TESTRAIL_REPORT_TEMPLATE_ID} is suppressed for now
    // (per request) — re-enable by restoring the trRequest('GET', `run_report/...`) call here.
  }
}

module.exports = TestRailReporter;
