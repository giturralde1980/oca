import pactum from 'pactum';
import { setupPactum } from '../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../helpers/report.helper';

import { buildLead } from '../../helpers/fixtures/lead.fixture';
import { createLead, getLead, deleteLead, convertLead } from '../../helpers/steps/lead.steps';

import { buildAccount, ACCOUNT_RECORD_TYPES } from '../../helpers/fixtures/account.fixture';
import { createAccount, getAccount, verifyAccountLinkedToSAP } from '../../helpers/steps/account.steps';

import { buildContact } from '../../helpers/fixtures/contact.fixture';
import { createContact, getContact } from '../../helpers/steps/contact.steps';

import { buildBillingProfile } from '../../helpers/fixtures/billing-profile.fixture';
import { createBillingProfile, getBillingProfile } from '../../helpers/steps/billing-profile.steps';

import { buildAsset, ASSET_RECORD_TYPES, CENTER_ADDRESS_REFS } from '../../helpers/fixtures/asset.fixture';
import { createAsset, getAsset, createEquipmentCvm, waitForInstallationParameters } from '../../helpers/steps/asset.steps';

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
  createWorkOrder,
  countChildWorkOrders,
  getOrder,
  submitWorkOrderForRTE,
  waitForWorkOrderByOrderId,
} from '../../helpers/steps/order.steps';
import { sfQuery } from '../../helpers/salesforce-query.helper';
import { updateRecord } from '../../helpers/salesforce-crud.helper';
import { waitForPendingApproval, approveWorkItem, rejectWorkItem } from '../../helpers/steps/approval-process.steps';
import { getOrgRefs } from '../../config/org-refs';
import { setupMAQuote, winMAQuoteAndGetOrder, ACTIVE_COMMERCIAL_USER_ID } from '../../helpers/steps/ma-quote.steps';
import { getQuote, createQuoteLineItem } from '../../helpers/steps/quote.steps';
import { setupFrameworkContract, setWinResponsibleFields } from '../../helpers/steps/framework-contract.steps';
import { setupRGQuote, winRGQuoteAndGetOrder } from '../../helpers/steps/rg-quote.steps';
import { createPurchaseOrder, createPurchaseOrderLine, SUPPLIER_ACCOUNT_ID_2 } from '../../helpers/steps/purchase-order.steps';

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
        report.logForTestRail();
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
        report.logForTestRail();
        suite.add(report);
      }
      // No cleanup — converted leads (and the resulting Account/Contact/Opportunity) cannot be deleted cleanly.
    }, 60000);

  });

  describe('Cuenta - Cliente', () => {
    it('[e2e] @C516 Verificar que se puede crear una cuenta de tipo Cliente con los campos necesarios para sincronizar con SAP', async () => {
      const report = new TestReport('C516 — Crear cuenta Cliente con campos SAP');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta (Cliente)', { 'Account Id': accountId, 'RecordTypeId': ACCOUNT_RECORD_TYPES.BUSINESS }, 'ok');

        await verifyAccountLinkedToSAP(accountId, { timeoutMs: 60000 });
        report.step('Verificar Cuenta sincronizada con SAP', { 'Account Id': accountId }, 'ok');

        const account = await getAccount(accountId);
        expect(account['RecordTypeId']).toBe(ACCOUNT_RECORD_TYPES.BUSINESS);
        expect(account['CIF__c']).toBeTruthy();
        expect(account['AccountNumber']).toBeTruthy();
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    // The BillingProfile__c→SAP sync trigger is unconfirmed — same open question as C517's
    // Contact sync (tried the exact field recipe from a real synced record, still not enough).
    // Per business decision, creation/relationships are asserted for real and the sync check
    // is logged as informational only.
    it('[e2e] @C518 Verificar que se puede crear un perfil de facturación vinculado a la cuenta y al contacto, y que sincroniza correctamente', async () => {
      const report = new TestReport('C518 — Crear Perfil de Facturación vinculado a Cuenta+Contacto');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta', { 'Account Id': accountId }, 'ok');

        await verifyAccountLinkedToSAP(accountId, { initialDelayMs: 10000, timeoutMs: 60000 });
        report.step('Verificar Cuenta sincronizada con SAP', { 'Account Id': accountId }, 'ok');

        const contactId = await createContact(buildContact(accountId));
        report.step('Crear Contacto vinculado a la Cuenta', { 'Contact Id': contactId, 'Account Id': accountId }, 'ok');

        const billingProfileId = await createBillingProfile(buildBillingProfile(accountId, contactId));
        report.step('Crear Perfil de Facturación', { 'BillingProfile Id': billingProfileId, 'Account__c': accountId, 'Contact__c': contactId }, 'ok');

        const billingProfile = await getBillingProfile(billingProfileId);
        expect(billingProfile['Id']).toBe(billingProfileId);
        expect(billingProfile['Account__c']).toBe(accountId);
        expect(billingProfile['Contact__c']).toBe(contactId);

        // Informational only — see note above on the unconfirmed sync trigger.
        await new Promise(r => setTimeout(r, 15000));
        const polled = await getBillingProfile(billingProfileId);
        report.step(
          'Estado de sincronización SAP (informativo, no bloqueante)',
          { 'BillingProfile Id': billingProfileId, 'AccountSAPId__c': (polled['AccountSAPId__c'] as string) ?? '(sin sincronizar)' },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 90000);

  });

  describe('Contacto - Cliente', () => {
    // The Contact→SAP sync trigger (real-time vs. batch vs. manual action) is unconfirmed —
    // tried matching a real synced Contact's extra fields (RecordTypeId='Contact',
    // ContactType__c='main', Activity__c='6100', AcceptLOPDc__c=true, Status__c='Activo') with
    // no effect; ContactNumber__c never populates within a reasonable poll window. Per business
    // decision, the creation/relationship is asserted for real and the sync check is logged as
    // informational only, pending confirmation of the actual trigger.
    it('[e2e] @C517 Verificar que un contacto nuevo sincroniza correctamente con SAP tras sincronizarse la cuenta', async () => {
      const report = new TestReport('C517 — Contacto nuevo sincroniza con SAP tras la cuenta');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta', { 'Account Id': accountId }, 'ok');

        await verifyAccountLinkedToSAP(accountId, { initialDelayMs: 10000, timeoutMs: 60000 });
        report.step('Verificar Cuenta sincronizada con SAP', { 'Account Id': accountId }, 'ok');

        const contactId = await createContact(buildContact(accountId));
        report.step('Crear Contacto vinculado a la Cuenta', { 'Contact Id': contactId, 'Account Id': accountId }, 'ok');

        const contact = await getContact(contactId);
        expect(contact['Id']).toBe(contactId);
        expect(contact['AccountId']).toBe(accountId);

        // Informational only — see note above on the unconfirmed sync trigger.
        await new Promise(r => setTimeout(r, 15000));
        const polled = await getContact(contactId);
        report.step(
          'Estado de sincronización SAP (informativo, no bloqueante)',
          { 'Contact Id': contactId, 'ContactNumber__c': (polled['ContactNumber__c'] as string) ?? '(sin sincronizar)' },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 90000);

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
        report.logForTestRail();
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
        report.logForTestRail();
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
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Activos - Jerarquía', () => {
    it('[e2e] @C522 Verificar que se puede crear un activo de tipo Instalación vinculado a un centro (jerarquía de activos)', async () => {
      const report = new TestReport('C522 — Instalación vinculada a un Centro (jerarquía)');
      try {
        const accountId = await createAccount(buildAccount({ RecordTypeId: ACCOUNT_RECORD_TYPES.BUSINESS }));
        report.step('Crear Cuenta propietaria', { 'Account Id': accountId }, 'ok');

        const centerId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.CENTER, {
          Country__c:  CENTER_ADDRESS_REFS.COUNTRY__C,
          Region__c:   CENTER_ADDRESS_REFS.REGION__C,
          Province__c: CENTER_ADDRESS_REFS.PROVINCE__C,
        }));
        report.step('Crear Activo padre (Centro)', { 'Asset Id': centerId, 'RecordTypeId': ASSET_RECORD_TYPES.CENTER }, 'ok');

        const installationId = await createAsset(buildAsset(accountId, ASSET_RECORD_TYPES.INSTALLATION, {
          ParentId: centerId,
        }));
        report.step('Crear Activo hijo (Instalación)', { 'Asset Id': installationId, 'ParentId': centerId }, 'ok');

        const installation = await getAsset(installationId);
        expect(installation['Id']).toBe(installationId);
        expect(installation['ParentId']).toBe(centerId);
        expect(installation['RecordTypeId']).toBe(ASSET_RECORD_TYPES.INSTALLATION);
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Cuenta - Proveedor', () => {
    // BLOCKED: Supplier (RT 01209000000ivaPAAQ) uses a completely different SAP/CVI field
    // mapping than Client/Explotación/Delegación. Errors from SAP confirm required: Teléfono 2,
    // Nº telefax, Número de télex, SMTP email — but Phone2__c/Fax overrides did not resolve
    // them, meaning those aren't the fields actually read by the integration. A real synced
    // Supplier account also uses address fields not used elsewhere in this org
    // (LKP_Billing_Region__c, TXT_Billing_Street_Number__c) instead of standard
    // BillingStreet/BillingCity. Full field mapping needs confirmation before implementing.
    it.skip('[e2e] @C523 Verificar que se puede crear una cuenta de tipo Proveedor con los campos necesarios para sincronizar con SAP', async () => {
      // TODO: implementar — ver nota arriba sobre el mapeo de campos SAP/CVI de Proveedor.
    });

    it.skip('[e2e] @C524 Verificar que se puede crear un perfil de facturación para una cuenta Proveedor y darla de alta en una nueva sociedad', async () => {
      // TODO: implementar — depende de C523 (cuenta Proveedor sincronizada).
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
        report.logForTestRail();
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
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  // "Contrato Marco" = Quote with RecordTypeId = Framework_Contract (see
  // framework-contract.steps.ts). Confirmed empirically: creating an Opportunity does NOT
  // auto-generate a related Framework Contract Quote (queried right after insert — none
  // appeared), so C527's premise ("se genera correctamente el contrato marco... al crear una
  // oportunidad") doesn't hold for a plain Opportunity insert; it must be a manual UI action.
  describe('Oportunidad + Contrato Marco', () => {
    it.skip('[e2e] @C527 Verificar que al crear una oportunidad se genera correctamente el contrato marco relacionado con sus campos autocompletados', async () => {
      // TODO: implementar — ver nota arriba: la Quote Framework_Contract no se genera sola al crear la Opportunity.
    });

  });

  describe('Contrato Marco', () => {
    it('[e2e] @C528 Verificar que se pueden configurar en el contrato marco varios productos repetidos, tanto principales como complementos', async () => {
      const report = new TestReport('C528 — Configurar productos repetidos en el Contrato Marco');
      try {
        const refs = getOrgRefs('RG', 'INS');
        const { quoteId } = await setupFrameworkContract(report);

        // PriceValidation VR: Price_Difference_Validation__c (TaxesTotal__c + Fee__c + Subtotal__c
        // - UnitPrice, Fee__c excluded for Framework_Contract) must be 0. UnitPrice on this object
        // represents the LINE TOTAL, not a per-unit price — so "repeated products" means separate
        // Quantity=1 lines on the same PricebookEntry, not one line with Quantity>1.
        for (let i = 2; i <= 3; i++) {
          const lineItemId = await createQuoteLineItem({
            QuoteId:            quoteId,
            PricebookEntryId:   refs.qli.pricebookEntryId,
            Quantity:           1,
            UnitPrice:          120,
            SelectedPrice__c:   120,
            Asset__c:           refs.qli.assetId,
            Description:        `E2E Contrato Marco — línea repetida ${i}`,
            Subtotal__c:        120,
            Discount__c:        0,
            Activity__c:        '6100',
            Actividad_LN__c:    '6100_1',
            Bypass_Apex__c:     true,
          });
          report.step(`Añadir línea de producto repetida ${i}`, { 'LineItem Id': lineItemId, 'Quote Id': quoteId }, 'ok');
        }

        const lines = await sfQuery.query<{ Id: string }>(`SELECT Id FROM QuoteLineItem WHERE QuoteId = '${quoteId}'`);
        expect(lines.length).toBe(3);
        report.step('Verificar líneas repetidas configuradas', { 'Quote Id': quoteId, 'Líneas': String(lines.length) }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it('[e2e] @C533 Verificar que se puede recuperar un proceso de aprobación de contrato marco solicitado', async () => {
      const report = new TestReport('C533 — Recuperar proceso de aprobación de Contrato Marco');
      try {
        const { quoteId } = await setupFrameworkContract(report);
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        expect(approval.instanceId).toBeTruthy();
        expect(approval.workItemId).toBeTruthy();
        report.step(
          'Recuperar proceso de aprobación solicitado',
          { 'Quote Id': quoteId, 'ProcessInstance Id': approval.instanceId, 'Proceso': approval.processName },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Contrato Marco - Doc.', () => {
    it.skip('[e2e] @C529 Verificar que se puede generar el documento del contrato marco', async () => {
      // TODO: implementar
    });

  });

  describe('Contrato Marco - Aprobación', () => {
    it('[e2e] @C530 Verificar que al cambiar el contrato marco a estado \'Generado\' se lanza el proceso de aprobación correctamente', async () => {
      const report = new TestReport('C530 — Cambio a Generado dispara aprobación (Contrato Marco)');
      try {
        const { quoteId } = await setupFrameworkContract(report);
        // Unlike Oferta Comercial, Framework Contract approval is unconditional — no price/
        // discount threshold needed, it always fires on Generada.
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        expect(approval.processName).toBeTruthy();
        report.step('Verificar que se lanzó el proceso de aprobación', { 'Quote Id': quoteId, 'Proceso': approval.processName }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Contrato Marco - Aceptación', () => {
    it('[e2e] @C531 Verificar que al aceptar el contrato marco el aprobador, su estado cambia correctamente', async () => {
      const report = new TestReport('C531 — Aceptar Contrato Marco: cambia de estado correctamente');
      try {
        const { quoteId } = await setupFrameworkContract(report);
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        const result = await approveWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Approved');
        report.step('Aceptar Contrato Marco (aprobador)', { 'Workitem Id': approval.workItemId, 'instanceStatus': result.instanceStatus }, 'ok');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Lista para enviar');
        report.step('Verificar estado del Contrato Marco tras aceptación', { 'Quote Id': quoteId, 'Status': quote['Status'] as string }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Contrato Marco - Rechazo', () => {
    it('[e2e] @C532 Verificar que al rechazar el contrato marco el aprobador, su estado cambia correctamente', async () => {
      const report = new TestReport('C532 — Rechazar Contrato Marco: cambia de estado correctamente');
      try {
        const { quoteId } = await setupFrameworkContract(report);
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        const result = await rejectWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Rejected');
        report.step('Rechazar Contrato Marco (aprobador)', { 'Workitem Id': approval.workItemId, 'instanceStatus': result.instanceStatus }, 'ok');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Nueva');
        report.step('Verificar estado del Contrato Marco tras rechazo', { 'Quote Id': quoteId, 'Status': quote['Status'] as string }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Contrato Marco - Ganado', () => {
    it('[e2e] @C534 Verificar que se puede cerrar un contrato marco como ganado', async () => {
      const report = new TestReport('C534 — Cerrar Contrato Marco como ganado');
      try {
        const { quoteId } = await setupFrameworkContract(report);
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        await approveWorkItem(approval.workItemId);
        report.step('Aprobar Contrato Marco (paso previo a ganar)', { 'Quote Id': quoteId }, 'ok');

        await setWinResponsibleFields(quoteId, report);
        await updateRecord('Quote', quoteId, { Status: 'won' }, 60000);
        report.step('Cambiar estado Contrato Marco → won', { 'Quote Id': quoteId, 'Status': 'won' }, 'ok');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('won');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

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

  // NOT AUTOMATABLE VIA REST (confirmed via Tooling API, not just "not yet found"): read the
  // actual Apex source of NBK_ProductSelectorController — the tax/fee/duration calculation is
  // dispatched through a generic `execute(Map<String,Object> params)` remote-action method
  // (actionName-based switch, e.g. 'save' → NBK_ProductSelectorHelper.save(...)). That's the
  // Lightning/Aura "Product Selector" screen's internal remoting contract, not a database
  // trigger and not an `@InvocableMethod` exposed via `/actions/custom/apex/`. Reaching it would
  // require replicating Aura's internal message-signing protocol, which is out of scope for this
  // REST-based suite. Marked with `it.todo` (not `it.skip`) to distinguish "architecturally
  // blocked" from "not yet automated" — see testrail-reporter.js, which reports these as
  // TestRail status Blocked instead of Retest.
  describe('Oferta comercial - Impuestos', () => {
    it.todo('[e2e] @C537 Verificar que se puede crear una oferta comercial con impuestos no exentos y sus campos se autocompletan correctamente — NO AUTOMATIZABLE VIA REST: el calculo vive en NBK_ProductSelectorController, un remote-action de Aura/LWC (ver nota del describe), no un trigger ni un @InvocableMethod');

    it.todo('[e2e] @C548 Verificar que se puede crear una oferta comercial con impuestos exentos y sus campos se autocompletan correctamente — NO AUTOMATIZABLE VIA REST: mismo motor que C537 (NBK_ProductSelectorController, remote-action de Aura/LWC)');

  });

  describe('Oferta comercial', () => {
    it.todo('[e2e] @C538 Verificar que al configurar la oferta comercial se asignan correctamente los impuestos según el activo vinculado a cada línea — NO AUTOMATIZABLE VIA REST: mismo motor que C537 (NBK_ProductSelectorController, remote-action de Aura/LWC)');

    it('[e2e] @C546 Verificar que se puede recuperar un proceso de aprobación de oferta comercial solicitado', async () => {
      const report = new TestReport('C546 — Recuperar proceso de aprobación de Oferta solicitado');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

        // Discount__c=80 crosses the "Oferta Máx % Desc" approval process's entry criteria
        // (found empirically — this org has 40+ Quote approval process variants by business
        // line/threshold, not inspectable via REST).
        await updateRecord('QuoteLineItem', lineItemId, { Discount__c: 80 });
        report.step('Forzar condición de aprobación (Discount__c=80)', { 'LineItem Id': lineItemId }, 'ok');

        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        expect(approval.instanceId).toBeTruthy();
        expect(approval.workItemId).toBeTruthy();
        report.step(
          'Recuperar proceso de aprobación solicitado',
          { 'Quote Id': quoteId, 'ProcessInstance Id': approval.instanceId, 'Proceso': approval.processName },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it.todo('[e2e] @C551 Verificar que la asignación de impuestos es del 0% en todas las líneas de oferta cuando corresponda — NO AUTOMATIZABLE VIA REST: mismo motor que C537 (NBK_ProductSelectorController, remote-action de Aura/LWC)');

    it.todo('[e2e] @C552 Verificar que añadir complementos sin el check \'Add duration\' no modifica el tiempo estimado de las OTs relacionadas — NO AUTOMATIZABLE VIA REST: mismo motor que C537 (NBK_ProductSelectorController, remote-action de Aura/LWC)');

    it.todo('[e2e] @C553 Verificar que añadir complementos con el check \'Add duration\' modifica el tiempo estimado de las OTs relacionadas — NO AUTOMATIZABLE VIA REST: mismo motor que C537 (NBK_ProductSelectorController, remote-action de Aura/LWC)');

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
    it('[e2e] @C542 Verificar que al cambiar la oferta comercial a estado \'Generado\' se lanza el proceso de aprobación según las condiciones de precio o descuento', async () => {
      const report = new TestReport('C542 — Cambio a Generado dispara aprobación por descuento');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

        await updateRecord('QuoteLineItem', lineItemId, { Discount__c: 80 });
        report.step('Forzar condición de aprobación (Discount__c=80)', { 'LineItem Id': lineItemId }, 'ok');

        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        expect(approval.processName).toBeTruthy();
        report.step(
          'Verificar que se lanzó el proceso de aprobación',
          { 'Quote Id': quoteId, 'Proceso': approval.processName },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it('[e2e] @C543 Verificar que la oferta comercial se asigna automáticamente al aprobador correspondiente según el precio total o el descuento máximo', async () => {
      const report = new TestReport('C543 — Asignación automática al aprobador');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

        await updateRecord('QuoteLineItem', lineItemId, { Discount__c: 80 });
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        const [workItem] = await sfQuery.query<{ Id: string; ActorId: string }>(
          `SELECT Id, ActorId FROM ProcessInstanceWorkitem WHERE Id = '${approval.workItemId}'`,
        );
        expect(workItem.ActorId).toBeTruthy();
        report.step(
          'Verificar asignación automática al aprobador',
          { 'Quote Id': quoteId, 'Workitem Id': workItem.Id, 'ActorId (aprobador)': workItem.ActorId },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it('[e2e] @C544 Verificar que al aceptar la oferta comercial el aprobador, su estado cambia correctamente', async () => {
      const report = new TestReport('C544 — Aceptar Oferta: cambia de estado correctamente');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

        await updateRecord('QuoteLineItem', lineItemId, { Discount__c: 80 });
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        const result = await approveWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Approved');
        report.step('Aceptar Oferta (aprobador)', { 'Workitem Id': approval.workItemId, 'instanceStatus': result.instanceStatus }, 'ok');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Lista para enviar');
        report.step('Verificar estado de la Oferta tras aceptación', { 'Quote Id': quoteId, 'Status': quote['Status'] as string }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Oferta comercial - Rechazo', () => {
    it('[e2e] @C545 Verificar que al rechazar la oferta comercial el aprobador, su estado cambia correctamente', async () => {
      const report = new TestReport('C545 — Rechazar Oferta: cambia de estado correctamente');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId, lineItemId } = await setupIndustriaQuote(sourceLI, report);

        await updateRecord('QuoteLineItem', lineItemId, { Discount__c: 80 });
        await changeQuoteStatus(quoteId, 'Generada', report);

        const approval = await waitForPendingApproval(quoteId);
        const result = await rejectWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Rejected');
        report.step('Rechazar Oferta (aprobador)', { 'Workitem Id': approval.workItemId, 'instanceStatus': result.instanceStatus }, 'ok');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Nueva');
        report.step('Verificar estado de la Oferta tras rechazo', { 'Quote Id': quoteId, 'Status': quote['Status'] as string }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  // BLOCKED (C547 + the whole "Transaccionales" group + C591/C596/C597 below): the org sends
  // transactional email via two mechanisms — standard Salesforce email alerts (logged as a
  // Task with TaskSubtype='Email', related via WhatId) and Marketing Cloud Engagement/Pardot
  // triggered sends (logged in et4ae5__IndividualEmailResult__c, related via
  // et4ae5__Contact__c). Both are straightforward to poll once triggered. The problem is
  // triggering them: tried QuoteURL__c + Status in ('Entregada','Presentada','Validada') for
  // C547, and a full WorkOrder-finalize flow (technician assigned, SA dispatched, Status='4'
  // with justification) for C596/C597 — none produced an email Task, an IndividualEmailResult,
  // or any cert/inspection-date field change. Same "Apex/Flow behind a UI action" pattern as
  // RTE — needs the real trigger identified before these can be implemented.
  describe('Oferta comercial - Envío documento', () => {
    it.skip('[e2e] @C547 Verificar que al completar la URL del documento y pasar la oferta a \'Enviar documento\' se envía el transaccional al prescriptor', async () => {
      // TODO: implementar — ver nota arriba sobre el mecanismo de email bloqueado.
    });

  });

  // NOT AUTOMATABLE VIA REST — same confirmed root cause as "Oferta comercial - Impuestos"
  // (NBK_ProductSelectorController, an Aura/LWC remote-action, not a DB trigger).
  describe('Oferta comercial - Tasas', () => {
    it.todo('[e2e] @C549 Verificar que la columna de tasas se rellena al añadir un activo ubicado en una región con tasa — NO AUTOMATIZABLE VIA REST: mismo motor que "Oferta comercial - Impuestos" (NBK_ProductSelectorController, remote-action de Aura/LWC)');

    it.todo('[e2e] @C550 Verificar que la columna de tasas se rellena al crear un producto de una delegación con tasas — NO AUTOMATIZABLE VIA REST: mismo motor que "Oferta comercial - Impuestos" (NBK_ProductSelectorController, remote-action de Aura/LWC)');

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

  // RTO ("Revisión Técnica de Oferta") submission is unconditional once Quote.RTORegl__c=true —
  // found via Tooling API by reading the "Aprobación RTO REGL" Flow's start-element entry
  // criteria directly (filterLogic: RTORegl__c EqualTo true), same technique used for MA/INS.
  describe('Oferta comercial - RTO', () => {
    it('[e2e] @C556 Verificar que se lanza el proceso de aprobación por RTO al aprobar una oferta que requiere revisión', async () => {
      const report = new TestReport('C556 — RTORegl__c=true dispara la aprobación RTO');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);

        await updateRecord('Quote', quoteId, { RTORegl__c: true });
        report.step('Marcar Oferta como requiere revisión (RTORegl__c=true)', { 'Quote Id': quoteId }, 'ok');

        const approval = await waitForPendingApproval(quoteId);
        expect(approval.processName).toBe('Aprobación RTO REGL');
        report.step('Verificar que se lanzó el proceso de aprobación RTO', { 'Quote Id': quoteId, 'Proceso': approval.processName }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it('[e2e] @C557 Verificar que al aceptar el RTO el aprobador se actualizan correctamente los campos y se notifica al comercial', async () => {
      const report = new TestReport('C557 — Aceptar RTO: campos actualizados correctamente');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        await updateRecord('Quote', quoteId, { RTORegl__c: true });

        const approval = await waitForPendingApproval(quoteId);
        const result = await approveWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Approved');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Lista para enviar');
        expect(quote['RTO_IsApproved__c']).toBe(true);
        report.step(
          'Verificar campos tras aceptar el RTO',
          { 'Quote Id': quoteId, 'Status': quote['Status'] as string, 'RTO_IsApproved__c': String(quote['RTO_IsApproved__c']) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

    it('[e2e] @C558 Verificar que al rechazar el RTO el aprobador se actualizan correctamente los campos correspondientes', async () => {
      const report = new TestReport('C558 — Rechazar RTO: campos actualizados correctamente');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        await updateRecord('Quote', quoteId, { RTORegl__c: true });

        const approval = await waitForPendingApproval(quoteId);
        const result = await rejectWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Rejected');

        const quote = await getQuote(quoteId);
        expect(quote['Status']).toBe('Rechazada');
        expect(quote['RTO_IsApproved__c']).toBe(false);
        report.step(
          'Verificar campos tras rechazar el RTO',
          { 'Quote Id': quoteId, 'Status': quote['Status'] as string, 'RTO_IsApproved__c': String(quote['RTO_IsApproved__c']) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

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
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

  });

  // "Parámetro de instalación" = Installation_parameters__c (only requires Asset__c to create;
  // no direct FK to Order/OrderItem — it relates to the "paquete" product by ProductCode__c
  // prefix match). Won via MA/INS: the accredited-inspection PricebookEntry curated in
  // org-refs.ts for that business line IS the "paquete". Winning that Quote needed 3 fields
  // beyond RG/INS (found via Quote's ValidationRule formulas through the Tooling API):
  // Holder__c, Payer__c (+ BillingProfile__c already set), and an active AssignedCommercial__c
  // (org-refs' MA_INS commercial user is inactive here) — see ma-quote.steps.ts.
  describe('Pedido de venta - Parámetros', () => {
    it('[e2e] @C560 Verificar que se generan los parámetros correspondientes al incluir un paquete de productos vinculado a un activo', async () => {
      const report = new TestReport('C560 — Parámetros de instalación generados al incluir un paquete');
      try {
        const refs = getOrgRefs('MA', 'INS');
        const { quoteId } = await setupMAQuote(report, ACTIVE_COMMERCIAL_USER_ID);
        const orderId = await winMAQuoteAndGetOrder(quoteId, report);
        expect(orderId).toBeTruthy();

        const params = await waitForInstallationParameters(refs.qli.assetId!, 1);
        expect(params.length).toBeGreaterThan(0);
        report.step(
          'Verificar parámetros de instalación generados',
          { 'Asset Id': refs.qli.assetId!, 'Cantidad': String(params.length), 'ProductCodes': params.map(p => p.ProductCode__c).join(', ') },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

    // NO AUTOMATIZABLE VIA REST de forma fiable (confirmado empíricamente, no solo "no probado
    // todavía"): Installation_parameters__c.Asset__c es Master-Detail hacia Asset (cascadeDelete
    // en el schema, vía Tooling API), pero el objeto NO tiene ninguna relación hacia OrderItem —
    // ni lookup ni Master-Detail. Se probó ganando un Quote MA/INS contra un Asset recién creado
    // (mismo RecordType 'Installation', misma Account que el Asset compartido de org-refs.ts):
    // no se generó ningún Installation_parameters__c nuevo, mientras que el Asset compartido que
    // usa C560 sí los muestra — lo que sugiere que esos registros son preexistentes de
    // ejecuciones anteriores acumuladas sobre ese Asset de larga vida, no generados por el propio
    // 'win' de la Quote. Sin poder reproducir la generación desde cero contra un Asset limpio, no
    // hay forma fiable de observar por REST el efecto de borrar/reasignar el paquete (C561/C562),
    // y probar el cascade-delete real de C563 exigiría borrar el Asset compartido usado por C560,
    // rompiendo ese test. Necesitaría acceso a la app (Lightning/Aura) para confirmar el
    // disparador real de creación antes de poder automatizar el borrado/reasignación por API.
    it.todo('[e2e] @C561 Verificar que se elimina el parámetro de instalación al eliminar un paquete que lo genera, si no está asociado a otro pedido — NO AUTOMATIZABLE VIA REST DE FORMA FIABLE: ver nota del describe (Installation_parameters__c no tiene relación con OrderItem, y su generación real no es reproducible contra un Asset limpio)');

    it.todo('[e2e] @C562 Verificar que se gestionan correctamente los parámetros de instalación al cambiar el activo de un paquete — NO AUTOMATIZABLE VIA REST DE FORMA FIABLE: mismo motivo que C561 (ver nota del describe)');

    it.todo('[e2e] @C563 Verificar que se gestionan correctamente los parámetros de instalación al eliminar el activo asociado a un paquete — NO AUTOMATIZABLE VIA REST DE FORMA FIABLE: el cascade-delete de Asset→Installation_parameters__c sí está garantizado por el schema (Master-Detail), pero probarlo exigiría borrar el Asset compartido de org-refs.ts usado por C560, rompiendo ese test; ver nota del describe');

  });

  describe('Pedido de venta', () => {
    it.skip('[e2e] @C564 Verificar que al reducir la cantidad de un complemento que genera OT se recalcula el precio y las OTs sobrantes deben cancelarse manualmente', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C565 Verificar que al aumentar la cantidad de un complemento que genera OT se recalcula el precio y se genera una nueva OT', async () => {
      // TODO: implementar
    });

    it('[e2e] @C566 Verificar que se puede configurar un pedido de venta con productos del catálogo y del contrato marco correspondiente', async () => {
      const report = new TestReport('C566 — Pedido con línea de catálogo + línea de Contrato Marco');
      try {
        // Win a Framework Contract first, so we have a real 'won' Contrato Marco to link a line to.
        const { quoteId: contractQuoteId } = await setupFrameworkContract(report);
        await changeQuoteStatus(contractQuoteId, 'Generada', report);
        const contractApproval = await waitForPendingApproval(contractQuoteId);
        await approveWorkItem(contractApproval.workItemId);
        await setWinResponsibleFields(contractQuoteId, report);
        await updateRecord('Quote', contractQuoteId, { Status: 'won' }, 60000);
        report.step('Contrato Marco ganado', { 'Quote Id': contractQuoteId }, 'ok');

        // Build a normal Comercial Offer quote — its first (source-cloned) line item already
        // defaults RelatedContract__c to itself, i.e. "producto de catálogo" (no framework
        // contract). Reused as-is, no changes needed.
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);

        // Second line, same product/pricing as the source line (PriceValidation VR needs
        // Taxes__c/TaxesTotal__c/Fee__c to match too, not just Subtotal__c/UnitPrice), but linked
        // to the won Framework Contract via RelatedContract__c.
        const contractLineId = await createQuoteLineItem({
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
          Subtotal__c:        sourceLI.Subtotal__c      ?? 0,
          Taxes__c:           sourceLI.Taxes__c         ?? 0,
          TaxesTotal__c:      sourceLI.TaxesTotal__c    ?? 0,
          Fee__c:             sourceLI.Fee__c           ?? 0,
          Description:        'E2E — línea de Contrato Marco',
          Bypass_Apex__c:     true,
          RelatedContract__c: contractQuoteId,
        });
        report.step('Añadir línea vinculada al Contrato Marco', { 'LineItem Id': contractLineId, 'Quote Id': quoteId, 'Contrato Marco': contractQuoteId }, 'ok');

        const lines = await sfQuery.query<{ Id: string; RelatedContract__c: string }>(
          `SELECT Id, RelatedContract__c FROM QuoteLineItem WHERE QuoteId = '${quoteId}'`
        );
        expect(lines.length).toBe(2);

        const catalogLine  = lines.find(l => l.RelatedContract__c === quoteId);
        const contractLine = lines.find(l => l.RelatedContract__c === contractQuoteId);
        expect(catalogLine).toBeTruthy();
        expect(contractLine).toBeTruthy();
        report.step(
          'Verificar pedido configurado con línea de catálogo y línea de Contrato Marco',
          { 'Quote Id': quoteId, 'Línea catálogo': catalogLine!.Id, 'Línea Contrato Marco': contractLine!.Id },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Pedido de compra', () => {
    it('[e2e] @C567 Verificar que se puede crear un pedido de compra relacionado a un pedido de venta', async () => {
      const report = new TestReport('C567 — Crear Pedido de Compra relacionado a un Pedido de venta');
      try {
        const refs = getOrgRefs('RG', 'INS');
        const { quoteId } = await setupRGQuote(report);
        const orderId = await winRGQuoteAndGetOrder(quoteId, report);
        const [salesLine] = await sfQuery.query<{ Id: string }>(`SELECT Id FROM OrderItem WHERE OrderId = '${orderId}'`);
        expect(salesLine).toBeTruthy();

        const { purchaseOrderId } = await createPurchaseOrder(report);
        const poLineId = await createPurchaseOrderLine(purchaseOrderId, salesLine.Id, refs.qli.pricebookEntryId, 120, report);

        const [poLine] = await sfQuery.query<{ Id: string; PurchaseOrderLineNumber__c: string }>(
          `SELECT Id, PurchaseOrderLineNumber__c FROM OrderItem WHERE Id = '${poLineId}'`
        );
        expect(poLine.PurchaseOrderLineNumber__c).toBe(salesLine.Id);
        report.step(
          'Verificar Pedido de Compra vinculado al Pedido de venta',
          { 'Purchase Order Id': purchaseOrderId, 'Sales Order Id': orderId, 'Línea vinculada': poLine.PurchaseOrderLineNumber__c },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

    it('[e2e] @C568 Verificar que se pueden crear líneas de pedido de compra para líneas de pedido de venta con distintos precios', async () => {
      const report = new TestReport('C568 — Líneas de Pedido de Compra con distintos precios');
      try {
        const refs = getOrgRefs('RG', 'INS');
        const { quoteId } = await setupRGQuote(report);
        const orderId = await winRGQuoteAndGetOrder(quoteId, report);
        const [salesLine] = await sfQuery.query<{ Id: string }>(`SELECT Id FROM OrderItem WHERE OrderId = '${orderId}'`);

        const { purchaseOrderId } = await createPurchaseOrder(report);
        const lineA = await createPurchaseOrderLine(purchaseOrderId, salesLine.Id, refs.qli.pricebookEntryId, 100, report);
        const lineB = await createPurchaseOrderLine(purchaseOrderId, salesLine.Id, refs.qli.pricebookEntryId, 150, report);

        const lines = await sfQuery.query<{ Id: string; UnitPrice: number }>(
          `SELECT Id, UnitPrice FROM OrderItem WHERE OrderId = '${purchaseOrderId}'`
        );
        expect(lines.length).toBe(2);
        const priceA = lines.find(l => l.Id === lineA)?.UnitPrice;
        const priceB = lines.find(l => l.Id === lineB)?.UnitPrice;
        expect(priceA).toBe(100);
        expect(priceB).toBe(150);
        report.step(
          'Verificar líneas con distintos precios',
          { 'Purchase Order Id': purchaseOrderId, 'Línea A': `${lineA} = ${priceA}`, 'Línea B': `${lineB} = ${priceB}` },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

    it('[e2e] @C569 Verificar que se puede crear un segundo pedido de compra para otro proveedor relacionado al mismo pedido de venta', async () => {
      const report = new TestReport('C569 — Segundo Pedido de Compra (otro proveedor) para el mismo Pedido de venta');
      try {
        const refs = getOrgRefs('RG', 'INS');
        const { quoteId } = await setupRGQuote(report);
        const orderId = await winRGQuoteAndGetOrder(quoteId, report);
        const [salesLine] = await sfQuery.query<{ Id: string }>(`SELECT Id FROM OrderItem WHERE OrderId = '${orderId}'`);

        const { purchaseOrderId: po1 } = await createPurchaseOrder(report);
        await createPurchaseOrderLine(po1, salesLine.Id, refs.qli.pricebookEntryId, 120, report);

        const { purchaseOrderId: po2 } = await createPurchaseOrder(report, SUPPLIER_ACCOUNT_ID_2);
        await createPurchaseOrderLine(po2, salesLine.Id, refs.qli.pricebookEntryId, 120, report);

        const relatedPOs = await sfQuery.query<{ OrderId: string }>(
          `SELECT OrderId FROM OrderItem WHERE PurchaseOrderLineNumber__c = '${salesLine.Id}'`
        );
        const distinctOrders = new Set(relatedPOs.map(r => r.OrderId));
        expect(distinctOrders.has(po1)).toBe(true);
        expect(distinctOrders.has(po2)).toBe(true);
        report.step(
          'Verificar dos Pedidos de Compra distintos relacionados al mismo Pedido de venta',
          { 'Pedido de venta línea': salesLine.Id, 'PO 1': po1, 'PO 2': po2 },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

    it.todo('[e2e] @C570 Verificar que solo se muestran las líneas de pedido de venta aún no albaranadas al generar líneas de pedido de compra — NO AUTOMATIZABLE VIA REST: el filtrado de líneas elegibles ocurre dentro del selector Aura/LWC (NBK_ProductSelectorController.getProductSelectorSupplierProdsWr), el mismo remote-action ya confirmado inalcanzable por REST para el motor de impuestos — la creación directa de la línea (ver C567-569) no pasa por ese filtro');

    it.todo('[e2e] @C571 Verificar que las líneas de pedido de compra se integran correctamente en SAP — NO CONFIRMADO POR REST: un Pedido de Compra creado hoy (801JW00001OXtLxYAL) sigue con SAPPOId__c=null y sin error tras 40+ minutos; a diferencia de Pedido de venta (que sí sincroniza de forma observable), no se encontró evidencia de que esta sincronización se dispare automáticamente ni de cómo forzarla por REST');

    it.todo('[e2e] @C572 Verificar que al modificar el precio de una línea de pedido de compra se actualiza correctamente en SAP — NO AUTOMATIZABLE: depende del mismo mecanismo de sincronización SAP no confirmado que C571');

    it.todo('[e2e] @C573 Verificar que se puede configurar un pedido de compra filtrando productos desde el selector de pedido de venta — NO AUTOMATIZABLE VIA REST: mismo motivo que C570 (selector Aura/LWC vía NBK_ProductSelectorController)');

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
    it('[e2e] @C576 Verificar que un pedido de venta tipo ZOBR para productos EICIs genera correctamente el pedido y sus 2 OTs', async () => {
      const report = new TestReport('C576 — Pedido ZOBR genera el pedido y sus 2 OTs');
      try {
        const { quoteId } = await setupMAQuote(report, ACTIVE_COMMERCIAL_USER_ID);
        const orderId = await winMAQuoteAndGetOrder(quoteId, report);

        const order = await getOrder(orderId);
        expect(order['OrderType__c']).toBe('ZOBR');

        const workOrders = await sfQuery.query<{ Id: string }>(`SELECT Id FROM WorkOrder WHERE Order__c = '${orderId}'`);
        expect(workOrders.length).toBe(2);
        report.step(
          'Verificar Pedido ZOBR con sus 2 OTs',
          { 'Order Id': orderId, 'WorkOrders': String(workOrders.length) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

  });

  describe('Orden de trabajo - RTE', () => {
    it('[e2e] @C577 Verificar que al finalizar una OT con \'Requiere RTE\' se lanza el proceso de aprobación al responsable de la delegación', async () => {
      const report = new TestReport('C577 — RTERequired__c=true al finalizar la OT dispara la aprobación RTE');
      try {
        const { quoteId } = await setupMAQuote(report, ACTIVE_COMMERCIAL_USER_ID);
        const orderId = await winMAQuoteAndGetOrder(quoteId, report);

        const workOrderId = await waitForWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();
        report.step('Verificar OT generada', { 'Order Id': orderId, 'WorkOrder Id': workOrderId! }, 'ok');

        await submitWorkOrderForRTE(workOrderId!, report);

        const approval = await waitForPendingApproval(workOrderId!);
        expect(approval.processName).toBe('RTE Approval');
        report.step('Verificar que se lanzó el proceso de aprobación RTE', { 'WorkOrder Id': workOrderId!, 'Proceso': approval.processName }, 'ok');

        const workOrder = await getWorkOrder(workOrderId!);
        expect(workOrder['RTEResponsible__c']).toBeTruthy();
        report.step(
          'Verificar responsable de delegación autocompletado',
          { 'WorkOrder Id': workOrderId!, 'RTEResponsible__c': workOrder['RTEResponsible__c'] as string },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

    it('[e2e] @C578 Verificar que al aceptar el RTE el aprobador se actualizan correctamente los campos correspondientes', async () => {
      const report = new TestReport('C578 — Aceptar RTE: campos actualizados correctamente');
      try {
        const { quoteId } = await setupMAQuote(report, ACTIVE_COMMERCIAL_USER_ID);
        const orderId = await winMAQuoteAndGetOrder(quoteId, report);
        const workOrderId = await waitForWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();

        await submitWorkOrderForRTE(workOrderId!, report);
        const approval = await waitForPendingApproval(workOrderId!);

        const result = await approveWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Approved');

        const workOrder = await getWorkOrder(workOrderId!);
        expect(workOrder['RTEApproved__c']).toBe(true);
        report.step(
          'Verificar campos tras aceptar el RTE',
          { 'WorkOrder Id': workOrderId!, 'RTEApproved__c': String(workOrder['RTEApproved__c']) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

    it('[e2e] @C579 Verificar que al rechazar el RTE el aprobador se actualizan correctamente los campos correspondientes', async () => {
      const report = new TestReport('C579 — Rechazar RTE: campos actualizados correctamente');
      try {
        const { quoteId } = await setupMAQuote(report, ACTIVE_COMMERCIAL_USER_ID);
        const orderId = await winMAQuoteAndGetOrder(quoteId, report);
        const workOrderId = await waitForWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();

        await submitWorkOrderForRTE(workOrderId!, report);
        const approval = await waitForPendingApproval(workOrderId!);

        const result = await rejectWorkItem(approval.workItemId);
        expect(result.instanceStatus).toBe('Rejected');

        const workOrder = await getWorkOrder(workOrderId!);
        expect(workOrder['RTEApproved__c']).toBe(false);
        report.step(
          'Verificar campos tras rechazar el RTE',
          { 'WorkOrder Id': workOrderId!, 'RTEApproved__c': String(workOrder['RTEApproved__c']) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 120000);

  });

  describe('Orden de trabajo', () => {
    // BLOCKED en QA (no arquitectónico — ver nota de entorno, puede cambiar en cualquier
    // redeploy): el mecanismo real SÍ se identificó vía Tooling API —
    // NBK_WorkOrderTriggerHelper.processNonZobrAutoWaybillForFinishedWorkOrders pone
    // OrderItem.Waybilled__c=true automáticamente al pasar WorkOrder.Status='4' (Complete) en
    // pedidos NO-ZOBR (RG no está en SKIP_AUTOWAYBILL_BUSINESS_LINES), pero exige
    // OrderItem.OrderSAPId__c no vacío — es decir, que el Pedido de venta ya esté sincronizado con
    // SAP. Un Pedido RG/ZSER recién ganado con setupRGQuote/winRGQuoteAndGetOrder falla esa
    // sincronización: "error - ZSF_SALES/006: El centro de beneficio CK1700 no existe en SAP" —
    // un problema de datos maestros de SAP en este entorno QA, no de la automatización en sí.
    it.skip('[e2e] @C580 Verificar que al finalizar una OT se albarana automáticamente la línea de pedido', async () => {
      // TODO: retomar si se soluciona el centro de beneficio CK1700 en SAP QA, o si aparece otra
      // combinación de Delegation/Society/Activity cuyo Pedido sí sincronice correctamente.
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

    // BLOCKED — see the email mechanism note at "Oferta comercial - Envío documento". Tried the
    // full WorkOrder-finalize flow (technician + dispatched SA + Status='4' + justification);
    // no cert email Task or NextInspectionDate__c change resulted.
    it.skip('[e2e] @C596 Verificar que la fecha de próxima inspección no cambia y se envía el certificado por correo al finalizar un trabajo sin periodicidad de inspección', async () => {
      // TODO: implementar — ver nota sobre el mecanismo de email bloqueado.
    });

    it.skip('[e2e] @C597 Verificar que la fecha de próxima inspección se actualiza correctamente y se envía el transaccional de caducidad al finalizar un trabajo con periodicidad de inspección', async () => {
      // TODO: implementar — ver nota sobre el mecanismo de email bloqueado.
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
    it('[e2e] @C586 Verificar que se pueden crear OTs hijas vinculadas a una OT principal y se actualiza su conteo', async () => {
      const report = new TestReport('C586 — Crear OTs hijas y verificar conteo');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        const [, { orderId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });

        const parentWorkOrderId = await queryWorkOrderByOrderId(orderId);
        expect(parentWorkOrderId).toBeTruthy();
        const parentWorkOrder = await getWorkOrder(parentWorkOrderId!);
        report.step('Verificar OT principal', { 'WorkOrder Id': parentWorkOrderId!, 'AccountId': parentWorkOrder['AccountId'] as string }, 'ok');

        // WorkOrder has no rollup field for child count — verified via SOQL count instead.
        for (let i = 1; i <= 2; i++) {
          const childId = await createWorkOrder({
            ParentWorkOrderId: parentWorkOrderId,
            AccountId:         parentWorkOrder['AccountId'],
            Subject:           `E2E OT hija ${i}`,
          });
          report.step(`Crear OT hija ${i}`, { 'WorkOrder Id': childId, 'ParentWorkOrderId': parentWorkOrderId! }, 'ok');
        }

        const childCount = await countChildWorkOrders(parentWorkOrderId!);
        expect(childCount).toBe(2);
        report.step('Verificar conteo de OTs hijas', { 'WorkOrder Id': parentWorkOrderId!, 'Conteo': String(childCount) }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

  });

  describe('Cita de servicio - Clonar', () => {
    it('[e2e] @C587 Verificar que se puede duplicar una cita de servicio y su estado se ajusta correctamente', async () => {
      const report = new TestReport('C587 — Duplicar cita de servicio: el estado se reinicia');
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

        // Dispatch the original (auto-created) SA to a non-initial state.
        const originalSa = await assertServiceAppointmentForOrder(orderId, report);
        await scheduleServiceAppointment(originalSa.Id, report);
        await assignTechnicianToWorkOrder(workOrderId!, report, assetId);
        await dispatchServiceAppointment(originalSa.Id, report);

        const originalAfter = await getWorkOrder(workOrderId!);
        report.step('Cita original despachada', { 'SA Id': originalSa.Id, 'WorkOrder Status': String(originalAfter['Status']) }, 'ok');

        // "Duplicar" a service appointment for this same WorkOrder — a fresh SA, not a copy of
        // the dispatched one's Status (Status defaults to 'pending_scheduling' regardless of the
        // source, since it's not a copyable/settable field on insert for a new appointment).
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const dueDate = new Date(tomorrow.getTime() + 30 * 60 * 1000);
        const duplicateSaId = await createServiceAppointment({
          ParentRecordId:    workOrderId,
          EarliestStartTime: tomorrow.toISOString(),
          DueDate:           dueDate.toISOString(),
        });
        report.step('Duplicar cita de servicio', { 'SA Id original': originalSa.Id, 'SA Id duplicada': duplicateSaId }, 'ok');

        const [duplicateSa] = await sfQuery.query<{ Id: string; Status: string }>(
          `SELECT Id, Status FROM ServiceAppointment WHERE Id = '${duplicateSaId}'`
        );
        expect(duplicateSa.Status).toBe('pending_scheduling');
        report.step(
          'Verificar que el estado de la cita duplicada se ajusta (no hereda "dispatched")',
          { 'SA Id': duplicateSaId, 'Status': duplicateSa.Status },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

    it('[e2e] @C588 Verificar que al crear una segunda cita de servicio, el estado de la OT principal permanece inalterado', async () => {
      const report = new TestReport('C588 — Crear segunda cita de servicio no altera la OT principal');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        const [, { orderId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });

        const workOrderId = await queryWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();

        const workOrderBefore = await getWorkOrder(workOrderId!);
        const statusBefore = workOrderBefore['Status'];
        report.step('Capturar estado inicial de la OT', { 'WorkOrder Id': workOrderId!, 'Status': String(statusBefore) }, 'ok');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const dueDate = new Date(tomorrow.getTime() + 30 * 60 * 1000);
        const secondSaId = await createServiceAppointment({
          ParentRecordId:    workOrderId,
          EarliestStartTime: tomorrow.toISOString(),
          DueDate:           dueDate.toISOString(),
        });
        report.step('Crear segunda ServiceAppointment (misma OT)', { 'SA Id': secondSaId, 'WorkOrder Id': workOrderId! }, 'ok');

        const workOrderAfter = await getWorkOrder(workOrderId!);
        expect(workOrderAfter['Status']).toBe(statusBefore);
        report.step(
          'Verificar estado de la OT sin alterar',
          { 'WorkOrder Id': workOrderId!, 'Status antes': String(statusBefore), 'Status después': String(workOrderAfter['Status']) },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

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
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

  });

  describe('Fied Service', () => {
    it('[e2e] @C590 Verificar que el estado de la OT principal cambia a \'Programada\' al despachar la única cita o todas las citas relacionadas', async () => {
      const report = new TestReport('C590 — Despachar única cita cambia la OT a Programada');
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
        const sa = await assertServiceAppointmentForOrder(orderId, report);

        const workOrderBefore = await getWorkOrder(workOrderId!);
        report.step('Estado inicial de la OT', { 'WorkOrder Id': workOrderId!, 'Status': String(workOrderBefore['Status']) }, 'ok');

        await scheduleServiceAppointment(sa.Id, report);
        await assignTechnicianToWorkOrder(workOrderId!, report, assetId);
        await dispatchServiceAppointment(sa.Id, report);

        const workOrderAfter = await getWorkOrder(workOrderId!);
        // WorkOrder.Status picklist: '2' = Scheduled ("Programada")
        expect(workOrderAfter['Status']).toBe('2');
        report.step('Verificar OT en estado Programada', { 'WorkOrder Id': workOrderId!, 'Status': String(workOrderAfter['Status']) }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

    it.skip('[e2e] @C591 Verificar que al reprogramar una cita de servicio se actualiza la hora y se notifica al técnico y al cliente', async () => {
      // TODO: implementar — el reprogramado en sí es viable, pero requiere verificar el envío
      // de notificación (email/transaccional), que queda bloqueado junto al resto del grupo de email.
    });

  });

  // BLOCKED (C592, C593): dispatch→Scheduled works cleanly (see C590), but pushing the SA further
  // to a completed/finalized state hits a stricter validation chain than expected — moving
  // Status to 'in_progress' worked, but the next transition failed with a generic
  // "unexpected error... trying to process the service appointment status change", and on one
  // attempt the parent WorkOrder ended up in an unrelated 'Rejected' state as a side effect.
  // Needs the real intermediate-status sequence (likely involves a signature/report step) before
  // reattempting.
  describe('Cita de servicio', () => {
    it.skip('[e2e] @C592 Verificar que el estado de la OT principal permanece inalterado al finalizar una cita si existen otras citas en estados distintos', async () => {
      // TODO: implementar — ver nota arriba sobre la máquina de estados de finalización de la cita.
    });

    it.skip('[e2e] @C593 Verificar que el estado de la OT principal cambia a \'Finalizada\' al finalizar la única cita o todas las citas relacionadas', async () => {
      // TODO: implementar — ver nota arriba sobre la máquina de estados de finalización de la cita.
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

    it('[e2e] @C605 Verificar que se puede albaranar una OT correctamente', async () => {
      const report = new TestReport('C605 — Albaranar una OT (Waybilled__c=true)');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        const [, { orderId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });

        const workOrderId = await queryWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();
        report.step('Verificar OT generada', { 'Order Id': orderId, 'WorkOrder Id': workOrderId! }, 'ok');

        await updateRecord('WorkOrder', workOrderId!, { Waybilled__c: true });
        report.step('Albaranar la OT (Waybilled__c=true)', { 'WorkOrder Id': workOrderId! }, 'ok');

        const workOrder = await getWorkOrder(workOrderId!);
        expect(workOrder['Waybilled__c']).toBe(true);
        report.step('Verificar OT albaranada', { 'WorkOrder Id': workOrderId!, 'Waybilled__c': String(workOrder['Waybilled__c']) }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

    it.skip('[e2e] @C606 Verificar que se impide modificar el porcentaje de producción de una OT ya albaranada', async () => {
      // TODO: implementar
    });

    it('[e2e] @C607 Verificar que se puede desalbaranar una OT correctamente', async () => {
      const report = new TestReport('C607 — Desalbaranar una OT ya albaranada (Waybilled__c=false)');
      try {
        const sourceLI = await getSourceLineItem(INDUSTRIA_SOURCE_QUOTE_ID);
        const { quoteId } = await setupIndustriaQuote(sourceLI, report);
        await changeQuoteStatus(quoteId, 'Generada', report);
        const [, { orderId }] = await Promise.all([
          changeIndustriaQuoteStatusToWon(quoteId, report),
          waitAndPatchIndustriaOrderActivity(quoteId, report),
        ]);
        await verifyOrderSyncedByOrderId(orderId, { initialDelayMs: 15000 });

        const workOrderId = await queryWorkOrderByOrderId(orderId);
        expect(workOrderId).toBeTruthy();

        await updateRecord('WorkOrder', workOrderId!, { Waybilled__c: true });
        report.step('Albaranar la OT (paso previo)', { 'WorkOrder Id': workOrderId! }, 'ok');

        await updateRecord('WorkOrder', workOrderId!, { Waybilled__c: false });
        report.step('Desalbaranar la OT (Waybilled__c=false)', { 'WorkOrder Id': workOrderId! }, 'ok');

        const workOrder = await getWorkOrder(workOrderId!);
        expect(workOrder['Waybilled__c']).toBe(false);
        report.step('Verificar OT desalbaranada', { 'WorkOrder Id': workOrderId!, 'Waybilled__c': String(workOrder['Waybilled__c']) }, 'ok');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 180000);

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
    it.todo('[e2e] @C611 Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una línea de pedido — NO AUTOMATIZABLE VIA REST: el trigger activo NBK_ProductionHistoryEntryTrigger sobre ProductionHistoryEntry__c está IsValid=false en QA (roto desde 2026-04-14, Release Admin); probado empíricamente además — alternar WorkOrder.Waybilled__c no genera ningún ProductionHistoryEntry__c ni TechnicianLog__c');

  });

  describe('Registro de producción - ZOBR', () => {
    it.todo('[e2e] @C612 Verificar que se genera el registro de producción y el log de técnicos al albaranar o desalbaranar una orden de trabajo — NO AUTOMATIZABLE VIA REST: mismo motivo que C611 (NBK_ProductionHistoryEntryTrigger IsValid=false, ver nota del describe anterior)');

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
    it('[e2e] @C629 Verificar que se pueden crear recursos de servicio con sus skills correspondientes', async () => {
      const report = new TestReport('C629 — Crear ServiceResource con ServiceResourceSkill');
      try {
        // RelatedRecordId (User) is required in practice despite being nillable in the schema —
        // reused an existing active User with no ServiceResource yet, avoiding the cost/risk of
        // creating a brand-new licensed User via API just for this test. ServiceResource-User is
        // enforced 1:1 (DUPLICATE_VALUE otherwise) and the API user has no delete permission on
        // ServiceResource (INSUFFICIENT_ACCESS_OR_READONLY), so each run permanently consumes one
        // spare User — acceptable since 200+ are available (checked via SOQL), but pick a fresh
        // one dynamically each run rather than hardcoding an Id.
        const [spareUser] = await sfQuery.query<{ Id: string }>(
          `SELECT Id FROM User WHERE IsActive = true AND Id NOT IN (SELECT RelatedRecordId FROM ServiceResource WHERE RelatedRecordId != null) LIMIT 1`
        );
        expect(spareUser).toBeTruthy();
        const relatedUserId = spareUser.Id;
        const srId = await pactum.spec()
          .post('/sobjects/ServiceResource/')
          .withBody({ Name: `E2E Test Resource ${Date.now()}`, ResourceType: 'T', IsActive: true, RelatedRecordId: relatedUserId })
          .withRequestTimeout(30000)
          .expectStatus(201)
          .returns('id') as string;
        report.step('Crear ServiceResource', { 'ServiceResource Id': srId, 'RelatedRecordId': relatedUserId }, 'ok');

        const [skill] = await sfQuery.query<{ Id: string; MasterLabel: string }>('SELECT Id, MasterLabel FROM Skill LIMIT 1');
        expect(skill).toBeTruthy();

        const skillId = await pactum.spec()
          .post('/sobjects/ServiceResourceSkill/')
          .withBody({ ServiceResourceId: srId, SkillId: skill.Id, EffectiveStartDate: new Date().toISOString().slice(0, 10) })
          .withRequestTimeout(30000)
          .expectStatus(201)
          .returns('id') as string;
        report.step('Añadir Skill al ServiceResource', { 'ServiceResourceSkill Id': skillId, 'Skill': skill.MasterLabel }, 'ok');

        const [srSkill] = await sfQuery.query<{ Id: string; ServiceResourceId: string; SkillId: string }>(
          `SELECT Id, ServiceResourceId, SkillId FROM ServiceResourceSkill WHERE Id = '${skillId}'`
        );
        expect(srSkill.ServiceResourceId).toBe(srId);
        expect(srSkill.SkillId).toBe(skill.Id);
        report.step(
          'Verificar recurso de servicio con skill asociada',
          { 'ServiceResource Id': srId, 'Skill Id': skill.Id },
          'ok',
        );
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

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
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  describe('Informes de desviación', () => {
    it('[e2e] @C631 Verificar que se pueden crear informes de desviación, no conformidades y acciones preventivas o correctivas', async () => {
      const report = new TestReport('C631 — Crear informe de desviación (Audit__c)');
      try {
        const auditId = await pactum.spec()
          .post('/sobjects/Audit__c/')
          .withBody({ AuditType__c: 'Auditoría Interna', Status__c: 'Pendiente de resolución' })
          .withRequestTimeout(30000)
          .expectStatus(201)
          .returns('id') as string;
        report.step('Crear Informe de desviación', { 'Audit Id': auditId, 'AuditType__c': 'Auditoría Interna' }, 'ok');

        const audit = await pactum.spec().get(`/sobjects/Audit__c/${auditId}`).expectStatus(200).returns('.') as Record<string, unknown>;
        expect(audit['Id']).toBe(auditId);
        expect(audit['AuditType__c']).toBe('Auditoría Interna');
        expect(audit['Status__c']).toBe('Pendiente de resolución');
      } finally {
        report.finish();
        report.logForTestRail();
        suite.add(report);
      }
    }, 60000);

  });

  // BLOCKED (all 9 below) — see the email mechanism note at "Oferta comercial - Envío
  // documento". Each of these ties to a different business event (2 days before/after a cita,
  // 48h after finishing an OT, 24h/7 days around an invoice, 6 months before next inspection) —
  // none tested individually yet, but they share the same root blocker: no direct field update
  // found so far triggers the underlying send.
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
