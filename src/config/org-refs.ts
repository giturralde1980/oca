// Single source of truth for all Salesforce org-specific IDs.
// Values live in testdata/<env>/org-refs.json (one per BusinessLine/Division combo) — on org
// refresh, update those files, not this one. To add a new BusinessLine/Division: add a new
// entry to testdata/<env>/org-refs.json for every environment.
import { getTestData } from './testdata';

export interface OrgRefs {
  opp: {
    recordTypeId: string | null;
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

type OrgRefsMatrix = Record<string, Record<string, OrgRefs>>;

export function getOrgRefs(businessLine: string, division: string): OrgRefs {
  const refs = getTestData<OrgRefsMatrix>('org-refs')[businessLine]?.[division];
  if (!refs) {
    throw new Error(
      `No org refs for ${businessLine}/${division}. Add them to testdata/<env>/org-refs.json`,
    );
  }
  return refs;
}
