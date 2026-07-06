import { setupPactum } from '../../helpers/request.helper';
import { TestReport, SuiteReport } from '../../helpers/report.helper';

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
    it.skip('[e2e] @C514 Verificar que se puede crear un candidato', async () => {
      // TODO: implementar
    });

    it.skip('[e2e] @C515 Verificar que al convertir un candidato se generan correctamente la cuenta, el contacto y la oportunidad', async () => {
      // TODO: implementar
    });

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
    it.skip('[e2e] @C517 Verificar que un contacto nuevo sincroniza correctamente con SAP tras sincronizarse la cuenta', async () => {
      // TODO: implementar
    });

  });

  describe('Activos - Centro', () => {
    it.skip('[e2e] @C519 Verificar que se puede crear un activo de tipo Centro', async () => {
      // TODO: implementar
    });

  });

  describe('Activos - Centro Internacional', () => {
    it.skip('[e2e] @C520 Verificar que se puede crear un activo de tipo Centro Internacional', async () => {
      // TODO: implementar
    });

  });

  describe('Activos - Instalación', () => {
    it.skip('[e2e] @C521 Verificar que se puede crear un activo de tipo Instalación', async () => {
      // TODO: implementar
    });

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
    it.skip('[e2e] @C525 Verificar que se puede crear una cuenta de tipo Explotación', async () => {
      // TODO: implementar
    });

  });

  describe('Cuenta - Delegación', () => {
    it.skip('[e2e] @C526 Verificar que se puede crear una cuenta de tipo Delegación', async () => {
      // TODO: implementar
    });

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
    it.skip('[e2e] @C559 Verificar que al aceptar la oferta comercial se genera correctamente el pedido con sus líneas y OTs', async () => {
      // TODO: implementar
    });

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
    it.skip('[e2e] @C589 Verificar que el estado de la OT principal permanece inalterado al despachar una cita si existen otras citas en estados distintos', async () => {
      // TODO: implementar
    });

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
    it.skip('[e2e] @C630 Verificar que se pueden crear activos de tipo equipo vinculados a magnitudes y CVM', async () => {
      // TODO: implementar
    });

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
