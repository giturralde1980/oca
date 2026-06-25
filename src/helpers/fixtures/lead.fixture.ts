import { faker } from '@faker-js/faker';

// RecordType "Otras LN" — the only type confirmed to convert without extra requirements
export const RECORD_TYPES = {
  OTRAS_LN: '012JW000001HQITYA4',
};

// Delegation__c must be an Account with RecordType = 'Delegacion' — required to convert a Lead
export const DELEGATIONS = {
  DEFAULT: '001JW00000sULUXYA4',
};

const CONTROL_LETTERS = 'JABCDEFGHI';

// Generates a valid Spanish CIF using the official check-digit algorithm
export function generateCIF(): string {
  // Restrict to A (Sociedad Anónima) — SAP rejects B-type CIFs in this org's validation config
  const letter = 'A';
  const digits = faker.string.numeric(7);

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits[i]);
    if ((i + 1) % 2 === 0) {
      sum += d;
    } else {
      const doubled = d * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  const control = ['K','P','Q','S','W'].includes(letter)
    ? CONTROL_LETTERS[controlDigit]
    : String(controlDigit);

  return `${letter}${digits}${control}`;
}

const REAL_ADDRESSES = [
  { Street: 'Carrer del Cisell 15',           City: 'Barcelona', State: 'Barcelona', PostalCode: '08038' },
  { Street: 'Calle Gran Vía 28',              City: 'Madrid',    State: 'Madrid',    PostalCode: '28013' },
  { Street: 'Avenida de la Constitución 1',   City: 'Sevilla',   State: 'Sevilla',   PostalCode: '41004' },
];

export interface LeadFixture {
  LastName: string;
  Company: string;
  RecordTypeId: string;
  Delegation__c: string;
  Email?: string;
  Phone?: string;
  Street?: string;
  City?: string;
  State?: string;
  PostalCode?: string;
  Country?: string;
  [key: string]: unknown;
}

export function buildLead(overrides: Partial<LeadFixture> = {}): LeadFixture {
  return {
    LastName:              faker.person.lastName(),
    Company:               faker.company.name(),
    Email:                 faker.internet.email({ provider: 'qa-automation.com' }),
    Phone:                 `6${faker.string.numeric(8)}`,
    ...faker.helpers.arrayElement(REAL_ADDRESSES),
    Country:               'Spain',
    RecordTypeId:          RECORD_TYPES.OTRAS_LN,
    Delegation__c:         DELEGATIONS.DEFAULT,
    DTT_fld_leadType__c:   'Por defecto',
    Division__c:           'PE - Servicios Técnicos',
    ...overrides,
  };
}
