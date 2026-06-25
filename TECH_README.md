# E2E Coverage — Tech Notes

## Bloqueador activo: Actividad_LN__c picklist dependiente de Section__c

### El problema

`Actividad_LN__c` es un picklist **restringido y dependiente** en los objetos Quote y Order.
El campo controlador es **`Section__c`** (no `Activity__c` como se podría asumir).

Cada valor de `Actividad_LN__c` solo es válido para un `Section__c` específico.
En QA, los valores de las BLs no-RG (`2430`, `2420`, `4511`, `5110`, etc.) **no están mapeados**
a las secciones correspondientes (`MI`, `BM`, `MA`, `SV`...) en la configuración del picklist dependiente.

El PATCH vía REST API con cualquiera de esos valores devuelve:
```
400 INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST: bad value for restricted picklist field: 2430
```

Esto ocurre tanto en Quote como en Order, independientemente del orden de los PATCHes.

### Por qué 6100_1 sí funciona

`6100_1` está mapeado a `Section__c = 'AC'`, que es la sección que usa RG/INS.
Es el único combo que pasa el flujo CPQ completo (Opportunity → Quote → QuoteLineItem → Order → SAP).

### Lo que hay que pedir al admin de Salesforce

Actualizar la configuración del picklist dependiente en el objeto **Quote** y en el objeto **Order**:

```
Section__c → Actividad_LN__c
```

Añadir los siguientes mapeos (verificados desde SAP orders reales en QA):

| Section__c | Actividad_LN__c válidos a añadir |
|------------|----------------------------------|
| `AC`       | ya tiene 6100_1 ✓ — añadir 6300_1, 7100_1, 7600_1 |
| `MI`       | 2420, 2430 |
| `BM` / `BL`| 4505, 4508, 4509, 4511 |
| `SV`       | 2324 |
| `MA` / `MB`/ `MD` | 5010, 5110, 5200_1 |

> Los valores ya existen en el picklist global — solo falta activarlos para cada sección.

---

## Estado del framework (listo para lanzar en cuanto se desbloquee el picklist)

### OrgRefs configurados (`src/config/org-refs.ts`)

| BL | Division | Society | OrderType | Verificado desde |
|----|----------|---------|-----------|-----------------|
| RG | INS | 7010 | ZSER | SAP orders 809116, 809117... |
| MC | INS | 1708 | ZSER | SAP orders 787521, 809096 |
| PR | PR  | 7503 | ZSER | SAP orders 787514, 787523, 787403 |
| SI | SI  | 1712 | ZSER | SAP order 809089 |
| MA | INS | 1200 | ZOBR | SAP orders 787283, 787387, 787402 |

### Combos activos (`src/helpers/fixtures/activity-combinations.ts`)

| BL/Div | Activity | Actividad_LN__c | Subactivity | Estado |
|--------|----------|-----------------|-------------|--------|
| RG/INS | 6100 | 6100_1 | 6101 | ✅ verde en QA |
| RG/INS | 6300 | 6300_1 | 6301 | ⏳ bloqueado por picklist |
| RG/INS | 7100 | 7100_1 | — | ⏳ bloqueado por picklist |
| RG/INS | 7600 | 7600_1 | — | ⏳ bloqueado por picklist |
| MC/INS | 2430 | 2430 | 2431 | ⏳ bloqueado por picklist |
| MC/INS | 2420 | 2420 | — | ⏳ bloqueado por picklist |
| PR/PR  | 4511 | 4511 | 4574 | ⏳ bloqueado por picklist |
| PR/PR  | 4508 | 4508 | — | ⏳ bloqueado por picklist |
| PR/PR  | 4505 | 4505 | — | ⏳ bloqueado por picklist |
| PR/PR  | 4509 | 4509 | — | ⏳ bloqueado por picklist |
| SI/SI  | 2324 | 2324 | — | ⏳ bloqueado por picklist |
| MA/INS | 5110 | 5110 | — | ⏳ bloqueado por picklist |
| MA/INS | 5200 | 5200_1 | — | ⏳ bloqueado por picklist |
| MA/INS | 5010 | 5010 | — | ⏳ bloqueado por picklist |

Combos comentados (pendientes de SAP o pendiente de OrgRefs):
- RG/INS: 6200, 6400, 6500, 8200, 8500, 8600, 8700, 8800, 9800 — profit center no configurado en SAP QA
- MC/INS: 2410 — pendiente verificación
- PR/PR: 4504 — usa OrderType ZOBR, requiere OrgRefs específico

### Cómo lanzar cuando se desbloquee

```bash
# Todos los combos (16 orders esperados):
npx jest activity-coverage --no-coverage --runInBand

# Solo RG/INS (funciona ya):
npx jest activity-coverage --no-coverage --runInBand --testNamePattern="RG/INS"

# Flow genérico (1 combo aleatorio):
npx jest generic-flow --no-coverage
```

### Arquitectura de ficheros clave

```
src/
  config/
    org-refs.ts                  — IDs de Salesforce por BL/Division (actualizar en cada refresh)
  helpers/
    fixtures/
      activity-combinations.ts   — combos Activity/Actividad_LN__c verificados desde SAP orders
      process.fixture.ts         — builders genéricos de payloads (Opp, Quote, QLI)
    steps/
      quote.steps.ts             — createQuote: PATCH Activity__c (Actividad_LN__c va al Order)
      order.steps.ts             — verifyOrderSyncedToSAP, patchOrderActivity
  tests/
    e2e-process/
      activity-coverage.spec.ts  — itera todos los combos activos, 1 order por combo
      generic-flow.spec.ts       — 1 combo aleatorio, útil para smoke test rápido
```

### Nota sobre el PATCH de Actividad_LN__c

El trigger de Salesforce resetea `Actividad_LN__c` en Quote INSERT.
El flujo actual:
1. POST Quote (con Activity__c, sin Actividad_LN__c)
2. PATCH Quote con `Activity__c` solamente (Actividad_LN__c sería rechazado)
3. Trigger Quote→Order crea el Order con Activity__c correcto, Actividad_LN__c null
4. **step 5b** en el spec: PATCH directo sobre el Order con Activity__c + Actividad_LN__c
   → también falla hoy por el mismo picklist dependiente
   → cuando el admin actualice el picklist, este step funcionará sin más cambios

---
*Última actualización: 2026-05-22*
