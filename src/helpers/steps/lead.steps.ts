import pactum from 'pactum';
import { XMLParser } from 'fast-xml-parser';
import { getAccessToken } from '../auth.helper';
import { INSTANCE_URL, API_VERSION } from '../request.helper';

export interface LeadPayload {
  LastName: string;
  Company: string;
  RecordTypeId?: string | null;
  Delegation__c?: string;
  Email?: string;
  Phone?: string;
  [key: string]: unknown;
}

export interface LeadConversionResult {
  accountId: string;
  contactId: string;
  opportunityId?: string;
}

export async function createLead(payload: LeadPayload): Promise<string> {
  const id = await pactum.spec()
    .post('/sobjects/Lead/')
    .withBody(payload)
    .withRequestTimeout(30000)
    .expectStatus(201)
    .returns('id');
  return id as string;
}

export async function getLead(id: string): Promise<Record<string, unknown>> {
  const lead = await pactum.spec()
    .get(`/sobjects/Lead/${id}`)
    .expectStatus(200)
    .returns('.');
  return lead as Record<string, unknown>;
}

export async function deleteLead(id: string): Promise<void> {
  await pactum.spec()
    .delete(`/sobjects/Lead/${id}`)
    .expectStatus(204);
}

export interface ConvertLeadOptions {
  // Opportunity is only generated when the Lead's Division__c maps to an Opportunity
  // RecordType that accepts that picklist value (confirmed working: Division__c='INS').
  createOpportunity?: boolean;
  opportunityName?:   string;
}

export async function convertLead(leadId: string, options: ConvertLeadOptions = {}): Promise<LeadConversionResult> {
  const { createOpportunity = false, opportunityName } = options;
  const token      = await getAccessToken();
  const soapVersion = API_VERSION.replace('v', '');

  const opportunityNameTag = createOpportunity
    ? `<opportunityName>${opportunityName ?? `E2E Opportunity ${Date.now()}`}</opportunityName>`
    : '';

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Header>
    <urn:SessionHeader>
      <urn:sessionId>${token}</urn:sessionId>
    </urn:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <urn:convertLead>
      <urn:leadConverts>
        <convertedStatus>converted</convertedStatus>
        <doNotCreateOpportunity>${!createOpportunity}</doNotCreateOpportunity>
        <leadId>${leadId}</leadId>
        ${opportunityNameTag}
        <overwriteLeadSource>false</overwriteLeadSource>
        <sendNotificationEmail>false</sendNotificationEmail>
      </urn:leadConverts>
    </urn:convertLead>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await pactum.spec()
    .post(`${INSTANCE_URL}/services/Soap/u/${soapVersion}`)
    .withHeaders({
      'Content-Type': 'text/xml; charset=UTF-8',
      'SOAPAction':   'convertLead',
    })
    .withBody(soapBody)
    .expectStatus(200)
    .toss();

  const raw = Buffer.isBuffer(response.body)
    ? response.body.toString('utf-8')
    : String(response.body);

  const parser  = new XMLParser({ ignoreAttributes: false });
  const parsed  = parser.parse(raw);
  const envelope = parsed['soapenv:Envelope'] ?? parsed['env:Envelope'];
  const body     = envelope['soapenv:Body']   ?? envelope['env:Body'];
  const result   = body['convertLeadResponse']['result'];

  if (result.success === false || result.success === 'false') {
    const errors = Array.isArray(result.errors) ? result.errors : [result.errors];
    throw new Error(`convertLead failed: ${errors.map((e: Record<string, string>) => e.message).join(', ')}`);
  }

  return {
    accountId:     result.accountId,
    contactId:     result.contactId,
    opportunityId: result.opportunityId ?? undefined,
  };
}
