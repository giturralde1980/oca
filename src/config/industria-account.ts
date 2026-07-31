import { getTestData } from './testdata';

export interface IndustriaAccountRefs {
  accountId:        string;
  contactId:        string;
  billingProfileId: string;
  assetIds:         string[];
}

/**
 * Devuelve los IDs de la cuenta de Industria a usar en los fixtures/steps, desde
 * testdata/<env>/industria-account.json. Ese archivo lo genera
 * npm run setup:industria-account (src/scripts/setup-industria-account.ts) — correrlo de nuevo
 * tras un refresh de sandbox para regenerar la cuenta y sus 6 Assets.
 */
export function getIndustriaAccountRefs(): IndustriaAccountRefs {
  return getTestData<IndustriaAccountRefs>('industria-account');
}
