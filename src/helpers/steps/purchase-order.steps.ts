import pactum from 'pactum';
import { TestReport } from '../report.helper';
import { getTestData } from '../../config/testdata';

interface StepsTestData {
  PURCHASE_ORDER_RECORD_TYPE:  string;
  SUPPLIER_ACCOUNT_ID:         string;
  SUPPLIER_ACCOUNT_ID_2:       string;
  PURCHASE_ORDER_DELEGATION:   string;
  PURCHASE_ORDER_PRICEBOOK_ID: string;
}
const stepsData = getTestData<StepsTestData>('steps');

// "Pedido de Compra" (Purchase Order) is an Order record with RecordTypeId = Purchase_Order.
// The wizard UI ("selector de pedido de venta", C573) goes through the same Aura-only
// NBK_ProductSelectorController remote-action dispatcher already confirmed unreachable via REST
// for the tax engine (getEmptyPurchaseOrderConfigWr / getProductSelectorPurchaseOrderConfigWr
// actions) — but the underlying data model is plain CRUD, so a Purchase Order + its lines can be
// built directly. The real link back to the originating Sales Order line is
// OrderItem.PurchaseOrderLineNumber__c — despite the label ("Purchase order line number") and
// being a plain Text(255) field (not a formal Lookup), it stores the Sales-Order OrderItem's Id
// as text (confirmed against real production-like PO records in QA).
export const PURCHASE_ORDER_RECORD_TYPE = stepsData.PURCHASE_ORDER_RECORD_TYPE;

// Real, already-synced Supplier accounts (RecordType 'Supplier', 01209000000ivaPAAQ) — creating a
// *new* Supplier account is a separate, currently-blocked concern (see C523's note on SAP/CVI
// field mapping); Purchase Order tests only need an existing one to point SupplierAccount__c at.
export const SUPPLIER_ACCOUNT_ID = stepsData.SUPPLIER_ACCOUNT_ID;
export const SUPPLIER_ACCOUNT_ID_2 = stepsData.SUPPLIER_ACCOUNT_ID_2;

export interface PurchaseOrderSetup {
  purchaseOrderId: string;
}

/**
 * Creates a minimal valid Purchase Order for RG/INS. Field recipe found empirically via a chain
 * of restricted-picklist controller fields (Tooling API describe): TaxGroup__c is controlled by
 * Society__c, and BusinessLine__c is controlled by Division__c — both must be set together with
 * the correct RG/INS values (Society '7010') or the picklist write is rejected even though the
 * value itself is valid in isolation. Delegation__c must also share the same BusinessLine.
 */
export async function createPurchaseOrder(
  report: TestReport,
  supplierAccountId: string = SUPPLIER_ACCOUNT_ID,
): Promise<PurchaseOrderSetup> {
  const purchaseOrderId = await pactum.spec()
    .post('/sobjects/Order/')
    .withBody({
      RecordTypeId:       PURCHASE_ORDER_RECORD_TYPE,
      AccountId:          supplierAccountId,
      SupplierAccount__c: supplierAccountId,
      Status:             'Pre-Borrador',
      EffectiveDate:      new Date().toISOString().slice(0, 10),
      Society__c:         '7010',
      TaxGroup__c:        'ZMWS-3',
      Delegation__c:      stepsData.PURCHASE_ORDER_DELEGATION,
      Division__c:        'INS',
      BusinessLine__c:    'RG',
      Pricebook2Id:       stepsData.PURCHASE_ORDER_PRICEBOOK_ID,
    })
    .expectStatus(201)
    .returns('id') as string;
  report.step('Crear Pedido de Compra', { 'Purchase Order Id': purchaseOrderId, 'SupplierAccount__c': supplierAccountId }, 'ok');

  return { purchaseOrderId };
}

/** Adds a Purchase Order line related back to a Sales Order line via PurchaseOrderLineNumber__c. */
export async function createPurchaseOrderLine(
  purchaseOrderId: string,
  salesOrderLineId: string,
  pricebookEntryId: string,
  unitPrice: number,
  report: TestReport,
): Promise<string> {
  const lineId = await pactum.spec()
    .post('/sobjects/OrderItem/')
    .withBody({
      OrderId:                    purchaseOrderId,
      PricebookEntryId:           pricebookEntryId,
      Quantity:                   1,
      UnitPrice:                  unitPrice,
      Subtotal__c:                unitPrice,
      TaxesTotal__c:              0,
      Fee__c:                     0,
      PurchaseOrderLineNumber__c: salesOrderLineId,
    })
    .expectStatus(201)
    .returns('id') as string;
  report.step(
    'Añadir línea de Pedido de Compra vinculada al Pedido de venta',
    { 'Purchase Order Line Id': lineId, 'Sales Order Line Id': salesOrderLineId },
    'ok',
  );
  return lineId;
}
