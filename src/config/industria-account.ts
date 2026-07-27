import * as fs from 'fs';
import * as path from 'path';

// Cuenta TAIKA original — se rompe con cualquier refresh/cambio de entorno porque no se
// puede recrear (es una cuenta real preexistente, no generada por este proyecto).
// Ver npm run setup:industria-account para generar un reemplazo dinámico en cualquier entorno.
const FALLBACK = {
  accountId:        '001JW000007t8vWYAQ',
  contactId:        '003JW00000xb6QxYAI',
  billingProfileId: 'a1XJW000002zb372AA',
  assetIds:         [] as string[], // vacío: queryAvailableIndustriaAsset sigue buscando en TAIKA si no hay generado
};

export interface IndustriaAccountRefs {
  accountId:        string;
  contactId:        string;
  billingProfileId: string;
  assetIds:         string[];
}

const GENERATED_PATH = path.join(__dirname, `industria-account.generated.${process.env.TEST_ENV || 'qa'}.json`);

let cached: IndustriaAccountRefs | null = null;

/**
 * Devuelve los IDs de la cuenta de Industria a usar en los fixtures/steps.
 * Si existe un archivo generado por setup-industria-account.ts para el entorno actual, se usa
 * ese (creado en este mismo entorno, así que sobrevive a un refresh). Si no existe, cae al
 * TAIKA hardcodeado original — comportamiento actual, sin romper nada para quien no haya
 * corrido el setup todavía.
 */
export function getIndustriaAccountRefs(): IndustriaAccountRefs {
  if (cached) return cached;

  if (fs.existsSync(GENERATED_PATH)) {
    const generated = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8'));
    cached = {
      accountId:        generated.accountId,
      contactId:        generated.contactId,
      billingProfileId: generated.billingProfileId,
      assetIds:         generated.assetIds ?? [],
    };
    return cached;
  }

  cached = FALLBACK;
  return cached;
}
