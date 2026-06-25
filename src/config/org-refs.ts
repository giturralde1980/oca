// Single source of truth for all Salesforce org-specific IDs.
// On org refresh: update only this file.
// To add a new BusinessLine/Division: add a new entry below and implement OrgRefs.

export interface OrgRefs {
  opp: {
    recordTypeId: string;
    contactId:    string;   // ContactId__c on Opportunity
    delegationId: string;
    section:      string;   // Section__c
  };
  quote: {
    recordTypeId:         string;
    pricebook2Id:         string;
    contactId:            string;
    delegationId:         string;
    society:              string;   // Society__c (SAP company code)
    orderType:            string;   // OrderType__c
    billingProfileId:     string | null;   // null for some BLs (e.g. SI)
    paymentResponsibleId: string | null;   // null for some BLs (e.g. SI)
  };
  qli: {
    pricebookEntryId: string;
    assetId:          string | null;   // null when BL has no asset-based products
  };
  shared: {
    accountId:               string;
    areaId:                  string;
    areaResponsibleId:       string;
    assignedCommercialId:    string;
    delegationResponsibleId: string;
    divisionResponsibleId:   string;
  };
}

// Verified 2026-06-02: switched from Barcelona (0800) to Girona (1700) delegation.
// ProfitCenter = CK + SalesOffice__c + Activity — Barcelona generated CK0800 which
// does not exist in SAP QA. Girona generates CK17006100 which does.
const RG_INS: OrgRefs = {
  opp: {
    recordTypeId: '012JW000000BzmcYAC',
    contactId:    '003JW000012ubJYYAY',
    delegationId: '001JW000007SxPjYAK',   // Girona - RG (SalesOffice 1700)
    section:      'AC',
  },
  quote: {
    recordTypeId:         '01209000000iw4VAAQ',
    pricebook2Id:         '01s0900000IoUU2AAN',
    contactId:            '003JW000012ubJYYAY',
    delegationId:         '001JW000007SxPjYAK',   // Girona - RG
    society:              '7010',
    orderType:            'ZSER',
    billingProfileId:     'a1XJW00000157hp2AA',   // Girona billing profile
    paymentResponsibleId: '003JW000012ubJYYAY',
  },
  qli: {
    pricebookEntryId: '01u0900000Ja5f0AAB',
    assetId:          '02iJW00000Boog2YAB',
  },
  shared: {
    accountId:               '001JW000007t8vWYAQ',
    areaId:                  '001JW000007SjbRYAS',
    areaResponsibleId:       '0050900000B1vneAAB',
    assignedCommercialId:    '005JW00000McaniYAB',
    delegationResponsibleId: '005Qu0000001PqnIAE',   // Girona delegation responsible
    divisionResponsibleId:   '005090000090m75AAA',
  },
};

// Verified 2026-05-22 from SAP orders 787521, 809096 (excl. propios).
const MC_INS: OrgRefs = {
  opp: {
    recordTypeId: '012JW000000BzmcYAC',
    contactId:    '003JW000012ubJYYAY',
    delegationId: '001JW000007SxQ7YAK',
    section:      'MI',
  },
  quote: {
    recordTypeId:         '01209000000iw4VAAQ',
    pricebook2Id:         '01s0900000Iwk3iAAB',
    contactId:            '003JW000012ubJYYAY',
    delegationId:         '001JW000007SxQ7YAK',
    society:              '1708',
    orderType:            'ZSER',
    billingProfileId:     'a1XJW000000AQ9J2AW',
    paymentResponsibleId: '003JW000005rgWGYAY',
  },
  qli: {
    pricebookEntryId: '01u0900000YUcc4AAD',
    assetId:          '02iJW000003J3N3YAK',
  },
  shared: {
    accountId:               '001JW000007t8vWYAQ',
    areaId:                  '001JW000007SjblYAC',
    areaResponsibleId:       '0050900000AzbNQAAZ',
    assignedCommercialId:    '0050900000AeA5JAAV',
    delegationResponsibleId: '0050900000AzbNQAAZ',
    divisionResponsibleId:   '005090000090m75AAA',
  },
};

// Verified 2026-05-22 from SAP orders 787514, 787523 (excl. propios).
// Note: 4504 uses OrderType ZOBR — excluded from combos until a ZOBR-specific OrgRefs is added.
const PR_PR: OrgRefs = {
  opp: {
    recordTypeId: '012JW000000BzmcYAC',
    contactId:    '003JW00000Z6RsdYAF',
    delegationId: '001JW00000iGpMzYAK',
    section:      'BM',
  },
  quote: {
    recordTypeId:         '01209000000iw4VAAQ',
    pricebook2Id:         '01sJW000003N8RNYA0',
    contactId:            '003JW00000Z6RsdYAF',
    delegationId:         '001JW00000iGpMzYAK',
    society:              '7503',
    orderType:            'ZSER',
    billingProfileId:     'a1XJW0000018mLR2AY',
    paymentResponsibleId: '003JW00000Z6Vg6YAF',
  },
  qli: {
    pricebookEntryId: '01uJW00000Ajt4RYAR',
    assetId:          '02iJW000009ldITYAY',
  },
  shared: {
    accountId:               '001JW00000XQrIhYAL',
    areaId:                  '001JW00000NBg0IYAT',
    areaResponsibleId:       '005JW00000KmaQ8YAJ',
    assignedCommercialId:    '005JW000008BP9rYAG',
    delegationResponsibleId: '005JW000008BP9rYAG',
    divisionResponsibleId:   '005JW00000Mc9yaYAB',
  },
};

// Verified 2026-05-22 from SAP order 809089 + recent won Quote (excl. propios).
// BillingProfile__c and PaymentResponsibleContact__c are null by design for SI.
const SI_SI: OrgRefs = {
  opp: {
    recordTypeId: '012JW000000BzmcYAC',
    contactId:    '003JW00001IVWK6YAP',
    delegationId: '001JW00000kqnaBYAQ',
    section:      'SV',
  },
  quote: {
    recordTypeId:         '01209000000iw4VAAQ',
    pricebook2Id:         '01sJW000009dkyfYAA',
    contactId:            '003JW00001IVWK6YAP',
    delegationId:         '001JW00000kqnaBYAQ',
    society:              '1712',
    orderType:            'ZSER',
    billingProfileId:     null,
    paymentResponsibleId: null,
  },
  qli: {
    pricebookEntryId: '01uJW00000RQnNHYA1',
    assetId:          null,
  },
  shared: {
    accountId:               '001JW00001JgcVGYAZ',
    areaId:                  '001JW00000ekP84YAE',
    areaResponsibleId:       '005JW00000T1ScfYAF',
    assignedCommercialId:    '005JW00000gsuDjYAI',
    delegationResponsibleId: '005JW00000T1ScfYAF',
    divisionResponsibleId:   '005JW00000T1ScfYAF',
  },
};

// Verified 2026-05-22 from SAP orders 787283, 787387 (with QuoteId) + 787402 (excl. propios).
// OrderType is ZOBR for all MA activities — confirmed across multiple orders.
// 5200_1 suffix confirmed: order 787387 has a linked Quote that went through full CPQ flow.
const MA_INS: OrgRefs = {
  opp: {
    recordTypeId: '012JW000000BzmcYAC',
    contactId:    '003JW00000XVURtYAP',
    delegationId: '001JW000007SxR4YAK',
    section:      'MA',
  },
  quote: {
    recordTypeId:         '01209000000iw4VAAQ',
    pricebook2Id:         '01s0900000IoWzwAAF',
    contactId:            '003JW00000XVURtYAP',
    delegationId:         '001JW000007SxR4YAK',
    society:              '1200',
    orderType:            'ZOBR',
    billingProfileId:     'a1XJW0000013VRh2AM',
    paymentResponsibleId: '003JW00000XVQBzYAP',
  },
  qli: {
    pricebookEntryId: '01u0900000iKVU0AAO',
    assetId:          '02iJW0000055lW5YAI',
  },
  shared: {
    accountId:               '001JW00000Vspq6YAB',
    areaId:                  '001JW000007SjbuYAC',
    areaResponsibleId:       '005090000090m7DAAQ',
    assignedCommercialId:    '0050900000AeA5JAAV',
    delegationResponsibleId: '005090000090m7DAAQ',
    divisionResponsibleId:   '005090000090m75AAA',
  },
};

// Add entries here as new BusinessLines/Divisions are onboarded.
const REFS: Record<string, Record<string, OrgRefs>> = {
  RG: { INS: RG_INS },
  MC: { INS: MC_INS },
  PR: { PR:  PR_PR  },
  SI: { SI:  SI_SI  },
  MA: { INS: MA_INS },
  // ED: { INS: ED_INS },
};

export function getOrgRefs(businessLine: string, division: string): OrgRefs {
  const refs = REFS[businessLine]?.[division];
  if (!refs) {
    throw new Error(
      `No org refs for ${businessLine}/${division}. Add them to src/config/org-refs.ts`,
    );
  }
  return refs;
}
