import { setupPactum } from '../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../helpers/report.helper';

import { buildLead } from '../../helpers/fixtures/lead.fixture';
import { createLead, getLead, deleteLead, convertLead } from '../../helpers/steps/lead.steps';

import { buildAccount, ACCOUNT_RECORD_TYPES } from '../../helpers/fixtures/account.fixture';
import { createAccount, getAccount } from '../../helpers/steps/account.steps';

// Contact fixture/steps (buildContact, createContact, verifyContactLinkedToSAP) are ready for
// reuse in C517 once the Contact→SAP sync trigger is confirmed — see note at that describe block.
import { getContact } from '../../helpers/steps/contact.steps';

import { buildAsset, ASSET_RECORD_TYPES, CENTER_ADDRESS_REFS } from '../../helpers/fixtures/asset.fixture';
import { createAsset, getAsset, createEquipmentCvm } from '../../helpers/steps/asset.steps';

import {
  getSourceLineItem,
  setupIndustriaQuote,
  changeQuoteStatus,
  changeIndustriaQuoteStatusToWon,
  waitAndPatchIndustriaOrderActivity,
} from '../../helpers/steps/industria-quote.steps';
import {
  verifyOrderSyncedByOrderId,
  queryWorkOrderByOrderId,
  getWorkOrder,
  assertServiceAppointmentForOrder,
  scheduleServiceAppointment,
  dispatchServiceAppointment,
  assignTechnicianToWorkOrder,
  releaseServiceAppointment,
  createServiceAppointment,
} from '../../helpers/steps/order.steps';
import { sfQuery } from '../../helpers/salesforce-query.helper';

// Source Quote used to seed line-item pricing data (same one used by the proven
// Industria E2E flow — reused here per business decision, see src/tests/e2e/quotes/industria).
const INDUSTRIA_SOURCE_QUOTE_ID = '0Q0JW0000083YJt0AM';

describe('Funcional — UAT Base', () => {
  let suite: SuiteReport;

  beforeAll(async () => {
    await setupPactum();
    suite = new SuiteReport('E2E UAT Base', 'UAT Base');
  });

  afterAll(() => {
    const reportPath = suite.generate('reports');
    suite.serialize('reports/.tmp');
    console.log(`\n[suite] Reporte generado: ${reportPath}`);
  });

  describe('Candidato', () => {
    it('[e2e] @C514 Verificar que se puede crear un candidato', async () => {
      const report = new TestReport('C514 — Crear candidato');
      let leadId: string | undefined;
      try {
        const lead = buildLead();
        leadId = await createLead(lead);
        report.step('Crear Lead', { 'Lead Id': leadId, 'LastName': lead.LastName, 'Company': lead.Company }, 'ok');

        const fetched = await getLead(leadId);
        expect(fetched['Id']).toBe(leadId);
        expect(fetched['LastName']).toBe(lead.LastName);
        expect(fetched['IsConverted']).toBe(false);
        report.step('Verificar Lead creado', { 'Lead Id': leadId, 'IsConverted': String(fetched['IsConverted']) }, 'ok');
      } finally {
        report.finish();
        suite.add(report);
        if (leadId) await deleteLead(leadId).catch(() => {});
      }
    }, 60000);

    it('[e2e] @C515 Verificar que al convertir un candidato se generan correctamente la cuenta, el contacto y la oportunidad', async () => {
      const report = new TestReport('C515 — Convertir candidato: cuenta + contacto + oportunidad');
      try {
        // Division__c='INS' is the only combination confirmed to make convertLead create the
        // Opportunity in the same call — other Division values convert Account+Contact fine but
        // are rejected by the Lead→Opportunity field mapping (INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST).
        const lead = buildLead({ Division__c: 'INS' });
        const leadId = await createLead(lead);
        report.step('Crear Lead', { 'Lead Id': leadId, 'Division__c': 'INS' }, 'ok');

        const result = await convertLead(leadId, { createOpportunity: true });
        report.step(
          'Convertir Lead',
          { 'Account Id': result.accountId, 'Contact Id': result.contactId, 'Opportunity Id': result.opportunityId },
          'ok',
        );
        expect(result.accountId).toBeTruthy();
        expect(result.contactId).toBeTruthy();
        expect(result.opportunityId).toBeTruthy();

        const account = await getAccount(result.accountId);
        expect(account['Id']).toBe(result.accountId);
        report.step('Verificar Cuenta generada', { 'Account Id': result.accountId, 'Name': account['Name'] as string }, 'ok');

        const contact = await getContact(result.contactId);
        expect(contact['AccountId']).toBe(result.accountId);
        report.step('Verificar Contacto generado', { 'Contact Id': result.contactId, 'AccountId': contact['AccountId'] as string }, 'ok');
      } finally {
        report.finish();
        suite.add(report);
      }
      // No cleanup — converted leads (and the resulting Account/Contact/Opportunity) cannot be deleted cleanly.
    }, 60000);

  });

  describe('Cuenta - Cliente', () => {
    it.skip('[e2e] @C516 Verificar que se puede crear una cuenta de tipo Cliente con los campos necesarios para sincronizar con SAP', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C518 Verificar que se puede crear un perfil de facturación vinculado a la cuenta y al contacto, y que sincroniza correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Contacto - Cliente', () => {
    // BLOCKED: Account syncs fine (valid Spanish address + CIF__c + InvoiceMail__c present via
    // buildAccount()), but a Contact created against that synced Account never gets
    // ContactNumber__c populated even after 2 min of polling — tried matching a real synced
    // Contact's extra fields (RecordTypeId='Contact', ContactType__c='main', Activity__c='6100',
    // AcceptLOPDc__c=true, Status__c='Activo') with no effect. The actual Contact→SAP sync
    // trigger (real-time vs. batch vs. manual action) is still unconfirmed — pending business input.
    it.skip('[e2e] @C517 Verificar que un contacto nuevo sincroniza correctamente con SAP tras sincronizarse la cuenta', async () => {
      // TODO: implementar — ver nota arriba sobre el trigger de sincronización de Contacto.
    });

  });

  describe('Activos - Centro', () => {
    it('[e2e] @C519 Verificar que se puede crear un activo de tipo Centro', async () => {
      const report = new TestReport('C519 — Crear activo tipo Centro');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta propietaria', { 'Account Id': accountId }, 'ok');

        const assetId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.CENTER, {
          Country__c:  CENTER_ADDRESS_REFS.COUNTRY__C,
          Region__c:   CENTER_ADDRESS_REFS.REGION__C,
          Province__c: CENTER_ADDRESS_REFS.PROVINCE__C,
        }));
        report.step('Crear Activo (Centro)', { 'Asset Id': assetId, 'RecordTypeId': ASSET_RECORD_TYPES.CENTER }, 'ok');

        const asset = await getAsset(assetId);
        expect(asset['Id']).toBe(assetId);
        expect(asset['AccountId']).toBe(accountId);
        expect(asset['RecordTypeId']).toBe(ASSET_RECORD_TYPES.CENTER);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Activos - Centro Internacional', () => {
    it('[e2e] @C520 Verificar que se puede crear un activo de tipo Centro Internacional', async () => {
      const report = new TestReport('C520 — Crear activo tipo Centro Internacional');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta propietaria', { 'Account Id': accountId }, 'ok');

        const assetId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.INTERNATIONAL_CENTER, {
          Country__c:  CENTER_ADDRESS_REFS.COUNTRY__C,
          Region__c:   CENTER_ADDRESS_REFS.REGION__C,
          Province__c: CENTER_ADDRESS_REFS.PROVINCE__C,
        }));
        report.step('Crear Activo (Centro Internacional)', { 'Asset Id': assetId, 'RecordTypeId': ASSET_RECORD_TYPES.INTERNATIONAL_CENTER }, 'ok');

        const asset = await getAsset(assetId);
        expect(asset['Id']).toBe(assetId);
        expect(asset['AccountId']).toBe(accountId);
        expect(asset['RecordTypeId']).toBe(ASSET_RECORD_TYPES.INTERNATIONAL_CENTER);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Activos - Instalación', () => {
    it('[e2e] @C521 Verificar que se puede crear un activo de tipo Instalación', async () => {
      const report = new TestReport('C521 — Crear activo tipo Instalación');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta propietaria', { 'Account Id': accountId }, 'ok');

        const assetId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.INSTALLATION));
        report.step('Crear Activo (Instalación)', { 'Asset Id': assetId, 'RecordTypeId': ASSET_RECORD_TYPES.INSTALLATION }, 'ok');

        const asset = await getAsset(assetId);
        expect(asset['Id']).toBe(assetId);
        expect(asset['AccountId']).toBe(accountId);
        expect(asset['RecordTypeId']).toBe(ASSET_RECORD_TYPES.INSTALLATION);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Activos - Jerarquía', () => {
    it.skip('[e2e] @C522 Verificar que se puede crear un activo de tipo Instalación vinculado a un centro (jerarquía de activos)', async () => {
      // TODO: implementar
    });

  });

  describe('Cuenta - Proveedor', () => {
    it.skip('[e2e] @C523 Verificar que se puede crear una cuenta de tipo Proveedor con los campos necesarios para sincronizar con SAP', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C524 Verificar que se puede crear un perfil de facturación para una cuenta Proveedor y darla de alta en una nueva sociedad', async () => {
      // TODO: implementar
    });

  });

  describe('Cuenta - Explotación', () => {
    it('[e2e] @C525 Verificar que se puede crear una cuenta de tipo Explotación', async () => {
      const report = new TestReport('C525 — Crear cuenta tipo Explotación');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.EXPLOTACION }));
        report.step('Crear Cuenta (Explotación)', { 'Account Id': accountId, 'RecordTypeId': ACCOUNT_RECORD_TYPES.EXPLOTACION }, 'ok');

        const account = await getAccount(accountId);
        expect(account['Id']).toBe(accountId);
        expect(account['RecordTypeId']).toBe(ACCOUNT_RECORD_TYPES.EXPLOTACION);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Cuenta - Delegación', () => {
    it('[e2e] @C526 Verificar que se puede crear una cuenta de tipo Delegación', async () => {
      const report = new TestReport('C526 — Crear cuenta tipo Delegación');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.DELEGACION }));
        report.step('Crear Cuenta (Delegación)', { 'Account Id': accountId, 'RecordTypeId': ACCOUNT_RECORD_TYPES.DELEGACION }, 'ok');

        const account = await getAccount(accountId);
        expect(account['Id']).toBe(accountId);
        expect(account['RecordTypeId']).toBe(ACCOUNT_RECORD_TYPES.DELEGACION);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Oportunidad + Contrato Marco', () => {
    it.skip('[e2e] @C527 Verificar que al crear una oportunidad se genera correctamente el contrato marco relacionado con sus campos autocompletados', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco', () => {
    it.skip('[e2e] @C528 Verificar que se pueden configurar en el contrato marco varios productos repetidos, tanto principales como complementos', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C533 Verificar que se puede recuperar un proceso de aprobación de contrato marco solicitado', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Doc.', () => {
    it.skip('[e2e] @C529 Verificar que se puede generar el documento del contrato marco', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Aprobación', () => {
    it.skip('[e2e] @C530 Verificar que al cambiar el contrato marco a estado \'Generado\' se lanza el proceso de aprobación correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Aceptación', () => {
    it.skip('[e2e] @C531 Verificar que al aceptar el contrato marco el aprobador, su estado cambia correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Rechazo', () => {
    it.skip('[e2e] @C532 Verificar que al rechazar el contrato marco el aprobador, su estado cambia correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Ganado', () => {
    it.skip('[e2e] @C534 Verificar que se puede cerrar un contrato marco como ganado', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Clonar', () => {
    it.skip('[e2e] @C535 Verificar que se puede clonar un contrato marco', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Versionar', () => {
    it.skip('[e2e] @C536 Verificar que se puede versionar un contrato marco', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Impuestos', () => {
    it.skip('[e2e] @C537 Verificar que se puede crear una oferta comercial con impuestos no exentos y sus campos se autocompletan correctamente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C548 Verificar que se puede crear una oferta comercial con impuestos exentos y sus campos se autocompletan correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial', () => {
    it.skip('[e2e] @C538 Verificar que al configurar la oferta comercial se asignan correctamente los impuestos según el activo vinculado a cada línea', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C546 Verificar que se puede recuperar un proceso de aprobación de oferta comercial solicitado', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C551 Verificar que la asignación de impuestos es del 0% en todas las líneas de oferta cuando corresponda', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C552 Verificar que añadir complementos sin el check \'Add duration\' no modifica el tiempo estimado de las OTs relacionadas', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C553 Verificar que añadir complementos con el check \'Add duration\' modifica el tiempo estimado de las OTs relacionadas', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Doc.', () => {
    it.skip('[e2e] @C539 Verificar que se puede generar el documento de la oferta comercial (Construcción)', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C540 Verificar que se puede generar el documento de la oferta comercial', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta Comercial - Pedido de compra', () => {
    it.skip('[e2e] @C541 Verificar que se generan correctamente los pedidos de compra al añadir productos de distintos catálogos de compra en la oferta comercial', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Aprobación', () => {
    it.skip('[e2e] @C542 Verificar que al cambiar la oferta comercial a estado \'Generado\' se lanza el proceso de aprobación según las condiciones de precio o descuento', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C543 Verificar que la oferta comercial se asigna automáticamente al aprobador correspondiente según el precio total o el descuento máximo', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C544 Verificar que al aceptar la oferta comercial el aprobador, su estado cambia correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Rechazo', () => {
    it.skip('[e2e] @C545 Verificar que al rechazar la oferta comercial el aprobador, su estado cambia correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Envío documento', () => {
    it.skip('[e2e] @C547 Verificar que al completar la URL del documento y pasar la oferta a \'Enviar documento\' se envía el transaccional al prescriptor', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Tasas', () => {
    it.skip('[e2e] @C549 Verificar que la columna de tasas se rellena al añadir un activo ubicado en una región con tasa', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C550 Verificar que la columna de tasas se rellena al crear un producto de una delegación con tasas', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Clonar', () => {
    it.skip('[e2e] @C554 Verificar que se puede clonar una oferta comercial', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Versionar', () => {
    it.skip('[e2e] @C555 Verificar que se puede versionar una oferta comercial', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - RTO', () => {
    it.skip('[e2e] @C556 Verificar que se lanza el proceso de aprobación por RTO al aprobar una oferta que requiere revisión', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C557 Verificar que al aceptar el RTO el aprobador se actualizan correctamente los campos y se notifica al comercial', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C558 Verificar que al rechazar el RTO el aprobador se actualizan correctamente los campos correspondientes', async () => {
      // TODO: implementar
    });

  });

  describe('Oferta comercial - Aceptación', () => {
    it('[e2e] @C559 Verificar que al aceptar la oferta comercial se genera correctamente el pedido con sus líneas y OTs', async () => {
      const report = new TestReport('C559 — Aceptar oferta comercial → Pedido + líneas + OTs');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);

        await changeQuoteStatus(quoteId, 'Generada', report);

        const [, { orderId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        expect(orderId).toBeTruthy();
        report.step('Verificar Pedido generado', { 'Quote Id': quoteId, 'Order Id': orderId }, 'ok');

        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });
        report.step('Verificar SAP sync (Pedido)', { 'Order Id': orderId }, 'ok');

        const orderLines = await sfQuery.query<{ Id: string }>(`SELECT Id FROM OrderItem WHERE OrderId = '${orderId}'`);
        expect(orderLines.length).toBeGreaterThan(0);
        report.step('Verificar líneas del Pedido', { 'Order Id': orderId, 'Líneas': String(orderLines.length) }, 'ok');

        const workOrderId = await queryWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();
        report.step('Verificar OT generada', { 'Order Id': orderId, 'WorkOrder Id': workOrderId ?? undefined }, 'ok');
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 180000);

  });

  describe('Pedido de venta - Parámetros', () => {
    it.skip('[e2e] @C560 Verificar que se generan los parámetros correspondientes al incluir un paquete de productos vinculado a un activo', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C561 Verificar que se elimina el parámetro de instalación al eliminar un paquete que lo genera, si no está asociado a otro pedido', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C562 Verificar que se gestionan correctamente los parámetros de instalación al cambiar el activo de un paquete', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C563 Verificar que se gestionan correctamente los parámetros de instalación al eliminar el activo asociado a un paquete', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de venta', () => {
    it.skip('[e2e] @C564 Verificar que al reducir la cantidad de un complemento que genera OT se recalcula el precio y las OTs sobrantes deben cancelarse manualmente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C565 Verificar que al aumentar la cantidad de un complemento que genera OT se recalcula el precio y se genera una nueva OT', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C566 Verificar que se puede configurar un pedido de venta con productos del catálogo y del contrato marco correspondiente', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de compra', () => {
    it.skip('[e2e] @C567 Verificar que se puede crear un pedido de compra relacionado a un pedido de venta', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C568 Verificar que se pueden crear líneas de pedido de compra para líneas de pedido de venta con distintos precios', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C569 Verificar que se puede crear un segundo pedido de compra para otro proveedor relacionado al mismo pedido de venta', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C570 Verificar que solo se muestran las líneas de pedido de venta aún no albaranadas al generar líneas de pedido de compra', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C571 Verificar que las líneas de pedido de compra se integran correctamente en SAP', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C572 Verificar que al modificar el precio de una línea de pedido de compra se actualiza correctamente en SAP', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C573 Verificar que se puede configurar un pedido de compra filtrando productos desde el selector de pedido de venta', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de venta - Clonar', () => {
    it.skip('[e2e] @C574 Verificar que se puede clonar un pedido de venta con sus líneas y su sincronización con SAP', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de venta - Trámites ZSER', () => {
    it.skip('[e2e] @C575 Verificar que un pedido de venta tipo ZSER con \'Pedido de tramitación\' no genera OTs y se albarana automáticamente', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de venta - Trámites ZOBR', () => {
    it.skip('[e2e] @C576 Verificar que un pedido de venta tipo ZOBR para productos EICIs genera correctamente el pedido y sus 2 OTs', async () => {
      // TODO: implementar
    });

  });

  describe('Orden de trabajo - RTE', () => {
    it.skip('[e2e] @C577 Verificar que al finalizar una OT con \'Requiere RTE\' se lanza el proceso de aprobación al responsable de la delegación', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C578 Verificar que al aceptar el RTE el aprobador se actualizan correctamente los campos correspondientes', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C579 Verificar que al rechazar el RTE el aprobador se actualizan correctamente los campos correspondientes', async () => {
      // TODO: implementar
    });

  });

  describe('Orden de trabajo', () => {
    it.skip('[e2e] @C580 Verificar que al finalizar una OT se albarana automáticamente la línea de pedido', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C583 Verificar que al finalizar una OT se puede albaranar manualmente la línea de pedido', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C584 Verificar que al finalizar una OT se albarana automáticamente el hito correspondiente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C585 Verificar que al finalizar una OT se puede albaranar manualmente el hito correspondiente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C596 Verificar que la fecha de próxima inspección no cambia y se envía el certificado por correo al finalizar un trabajo sin periodicidad de inspección', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C597 Verificar que la fecha de próxima inspección se actualiza correctamente y se envía el transaccional de caducidad al finalizar un trabajo con periodicidad de inspección', async () => {
      // TODO: implementar
    });

  });

  describe('Pedido de venta - Albaranado', () => {
    it.skip('[e2e] @C581 Verificar que se puede desalbaranar manualmente una línea de pedido', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C582 Verificar que al modificar el importe de una línea de pedido se lanza un nuevo albaranado', async () => {
      // TODO: implementar
    });

  });

  describe('Orden de trabajo - hijas', () => {
    it.skip('[e2e] @C586 Verificar que se pueden crear OTs hijas vinculadas a una OT principal y se actualiza su conteo', async () => {
      // TODO: implementar
    });

  });

  describe('Cita de servicio - Clonar', () => {
    it.skip('[e2e] @C587 Verificar que se puede duplicar una cita de servicio y su estado se ajusta correctamente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C588 Verificar que al crear una segunda cita de servicio, el estado de la OT principal permanece inalterado', async () => {
      // TODO: implementar
    });

  });

  describe('Field Service - Despachar', () => {
    it('[e2e] @C589 Verificar que el estado de la OT principal permanece inalterado al despachar una cita si existen otras citas en estados distintos', async () => {
      const report = new TestReport('C589 — Despachar una cita no altera el estado de la OT principal');
      let dispatchedSaId: string | undefined;
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);

        await changeQuoteStatus(quoteId, 'Generada', report);

        const [, { orderId, assetId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });

        const workOrderId = await queryWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();

        // First (auto-created) SA stays 'pending_scheduling' — this is the "otra cita en estado distinto".
        const firstSa = await assertServiceAppointmentForOrder(orderId, report);
        expect(firstSa.Status).toBe('pending_scheduling');

        const workOrderBefore = await getWorkOrder(workOrderId!);
        const statusBefore = workOrderBefore['Status'];
        report.step('Capturar estado inicial de la OT', { 'WorkOrder Id': workOrderId!, 'Status': String(statusBefore) }, 'ok');

        // Second SA on the same WorkOrder, scheduled and then dispatched — the one we despachar.
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const dueDate = new Date(tomorrow.getTime() + 30 * 60 * 1000);
        dispatchedSaId = await createServiceAppointment({
          ParentRecordId:    workOrderId,
          EarliestStartTime: tomorrow.toISOString(),
          DueDate:           dueDate.toISOString(),
        });
        report.step('Crear segunda ServiceAppointment (misma OT)', { 'SA Id': dispatchedSaId, 'WorkOrder Id': workOrderId! }, 'ok');

        await scheduleServiceAppointment(dispatchedSaId, report);
        await assignTechnicianToWorkOrder(workOrderId!, report, assetId);
        await dispatchServiceAppointment(dispatchedSaId, report);

        const workOrderAfter = await getWorkOrder(workOrderId!);
        expect(workOrderAfter['Status']).toBe(statusBefore);
        report.step(
          'Verificar estado de la OT sin alterar',
          { 'WorkOrder Id': workOrderId!, 'Status antes': String(statusBefore), 'Status después': String(workOrderAfter['Status']) },
          'ok',
        );
      } finally {
        if (dispatchedSaId) await releaseServiceAppointment(dispatchedSaId).catch(() => {});
        report.finish();
        suite.add(report);
      }
    }, 180000);

  });

  describe('Fied Service', () => {
    it.skip('[e2e] @C590 Verificar que el estado de la OT principal cambia a \'Programada\' al despachar la única cita o todas las citas relacionadas', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C591 Verificar que al reprogramar una cita de servicio se actualiza la hora y se notifica al técnico y al cliente', async () => {
      // TODO: implementar
    });

  });

  describe('Cita de servicio', () => {
    it.skip('[e2e] @C592 Verificar que el estado de la OT principal permanece inalterado al finalizar una cita si existen otras citas en estados distintos', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C593 Verificar que el estado de la OT principal cambia a \'Finalizada\' al finalizar la única cita o todas las citas relacionadas', async () => {
      // TODO: implementar
    });

  });

  describe('Orden de trabajo - Grave', () => {
    it.skip('[e2e] @C594 Verificar que se activa la consola de generación manual de segundas visitas al finalizar una OT con resultado \'Grave\' o \'Crítico\'', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C595 Verificar que se generan automáticamente las segundas visitas dos días después de un resultado \'Grave\'', async () => {
      // TODO: implementar
    });

  });

  describe('Programación', () => {
    it.skip('[e2e] @C598 Verificar que se pueden programar trabajos desde la consola custom de programación', async () => {
      // TODO: implementar
    });

  });

  describe('Albaranado - ZOBR', () => {
    it.skip('[e2e] @C599 Verificar que se generan correctamente las N OTs con sus hitos al crear líneas de pedido con complemento en un pedido tipo ZOBR', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C600 Verificar que aparece el botón \'Sincronizar\' en la línea de pedido para sincronizar los pesos de los hitos', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C601 Verificar que se impide sincronizar los pesos de los hitos si la suma de porcentajes de producción no es 100%', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C602 Verificar que se pueden sincronizar con SAP los pesos de los hitos cuando la suma de porcentajes es 100%', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C603 Verificar que el menú de albaranado de la OT solo aparece cuando la sincronización de hitos ha sido exitosa', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C604 Verificar que se impide albaranar las OTs al modificar el peso de alguna de ellas hasta volver a sincronizar', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C605 Verificar que se puede albaranar una OT correctamente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C606 Verificar que se impide modificar el porcentaje de producción de una OT ya albaranada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C607 Verificar que se puede desalbaranar una OT correctamente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C608 Verificar que el estado de la línea de pedido cambia a \'Realizado\' al albaranar todas sus OTs', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C609 Verificar que el estado de la línea de pedido se actualiza correctamente al desalbaranar una OT ya albaranada', async () => {
      // TODO: implementar
    });

  });

  describe('Albaranado', () => {
    it.skip('[e2e] @C610 Verificar que se puede albaranar una línea comercial vinculada a una OT de visita finalizada', async () => {
      // TODO: implementar
    });

  });

  describe('Registro de producción - ZSER', () => {
    it.skip('[e2e] @C611 Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una línea de pedido', async () => {
      // TODO: implementar
    });

  });

  describe('Registro de producción - ZOBR', () => {
    it.skip('[e2e] @C612 Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una orden de trabajo', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - ZSER', () => {
    it.skip('[e2e] @C613 Verificar que se puede generar una factura desde la pantalla de facturación manual del pedido de venta', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C614 Verificar que la factura generada se sincroniza correctamente con SAP', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - ZOBR', () => {
    it.skip('[e2e] @C615 Verificar que se muestra un único plan de facturación al 100% en pedidos tipo ZOBR', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C616 Verificar que se impide crear planes de facturación que no sumen un 100%', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C617 Verificar que se puede facturar seleccionando solo algunos planes de facturación, calculando el importe correctamente', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - Proforma', () => {
    it.skip('[e2e] @C618 Verificar que se puede generar una proforma sincronizada con SAP', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - Emitida', () => {
    it.skip('[e2e] @C619 Verificar que se puede generar directamente una factura emitida sincronizada con SAP', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación', () => {
    it.skip('[e2e] @C620 Verificar que se puede generar una factura emitida a partir de una proforma', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C627 Verificar que se genera la notificación de facturación electrónica al facturar una cuenta con ese check marcado', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - Abono', () => {
    it.skip('[e2e] @C621 Verificar que se puede abonar una factura emitida con facturación por hitos y se liberan los planes de facturación', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación -  ZOBR', () => {
    it.skip('[e2e] @C622 Verificar que se pueden facturar planes que estaban en una factura ya abonada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C623 Verificar que se pueden reutilizar planes de facturación de una proforma que fue borrada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C624 Verificar que una factura sin cobro cambia a estado \'Impagada\' y se envía el transaccional correspondiente', async () => {
      // TODO: implementar
    });

  });

  describe('Facturación - Cobro', () => {
    it.skip('[e2e] @C625 Verificar que el estado de una factura cambia a \'Cobrado\' al contabilizar el cobro en SAP', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C626 Verificar que el estado de una factura cambia a \'Impagada\' al modificar su fecha de vencimiento', async () => {
      // TODO: implementar
    });

  });

  describe('Pedidos - Refacturación', () => {
    it.skip('[e2e] @C628 Verificar que se puede realizar el proceso de refacturación entre sociedades', async () => {
      // TODO: implementar
    });

  });

  describe('Recursos de servicio', () => {
    it.skip('[e2e] @C629 Verificar que se pueden crear recursos de servicio con sus skills correspondientes', async () => {
      // TODO: implementar
    });

  });

  describe('Activos - Equipo', () => {
    it('[e2e] @C630 Verificar que se pueden crear activos de tipo equipo vinculados a magnitudes y CVM', async () => {
      const report = new TestReport('C630 — Crear activo tipo Equipo vinculado a magnitudes y CVM');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta propietaria', { 'Account Id': accountId }, 'ok');

        const assetId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.EQUIPMENT));
        report.step('Crear Activo (Equipo)', { 'Asset Id': assetId, 'RecordTypeId': ASSET_RECORD_TYPES.EQUIPMENT }, 'ok');

        // NumberOfMagnitudes__c/CalibratedMagnitudes__c on Asset are read-only rollups, and
        // EquipmentCVM__c.Magnitude__c is a dependent lookup filtered by Equipment__c — a fresh
        // synthetic Asset has no pre-associated magnitudes, so any Magnitude__c value is rejected
        // (FIELD_FILTER_VALIDATION_EXCEPTION). The CVM↔Asset link itself is what "vinculado a
        // magnitudes y CVM" verifies here; Magnitude__c is left unset (nillable).
        const cvmId = await createEquipmentCvm(assetId);
        report.step('Crear CVM vinculado al Activo', { 'EquipmentCVM Id': cvmId, 'Equipment__c': assetId }, 'ok');

        const asset = await getAsset(assetId);
        expect(asset['Id']).toBe(assetId);
        expect(asset['RecordTypeId']).toBe(ASSET_RECORD_TYPES.EQUIPMENT);

        const [cvm] = await sfQuery.query<{ Id: string; Equipment__c: string }>(
          `SELECT Id, Equipment__c FROM EquipmentCVM__c WHERE Id = '${cvmId}'`,
        );
        expect(cvm?.Equipment__c).toBe(assetId);
      } finally {
        report.finish();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Informes de desviación', () => {
    it.skip('[e2e] @C631 Verificar que se pueden crear informes de desviación, no conformidades y acciones preventivas o correctivas', async () => {
      // TODO: implementar
    });

  });

  describe('Transaccionales', () => {
    it.skip('[e2e] @C632 Verificar que se envía el transaccional al prescriptor al cambiar la oferta comercial a \'Enviar documento\'', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C633 Verificar que se envía el transaccional al técnico interno 2 días antes de la cita programada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C634 Verificar que se envía el transaccional al titular y al prescriptor 2 días antes de la cita programada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C635 Verificar que se envía el transaccional al técnico interno cuando quedan menos de 2 días para la cita', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C636 Verificar que se envía el transaccional al titular y al prescriptor cuando quedan menos de 2 días para la cita', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C637 Verificar que se envía el informe al cliente 48 horas después de finalizar la OT', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C638 Verificar que se envía el transaccional al contacto responsable de pago 24 horas después de emitir la factura', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C639 Verificar que se envía el transaccional al contacto responsable de pago 7 días después de vencer una factura impagada', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C640 Verificar que se envía el transaccional al titular y al prescriptor 6 meses antes de la próxima inspección', async () => {
      // TODO: implementar
    });

  });

});
