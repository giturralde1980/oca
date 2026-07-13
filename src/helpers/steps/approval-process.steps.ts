import pactum from 'pactum';
import { getAccessToken } from '../auth.helper';
import { INSTANCE_URL, API_VERSION } from '../request.helper';
import { sfQuery } from '../salesforce-query.helper';

export interface PendingApproval {
  instanceId:  string;
  workItemId:  string;
  processName: string;
}

interface ApprovalActionResult {
  success:       boolean;
  errors:        unknown;
  instanceStatus: string;
}

// This org has 40+ approval process variants on Quote alone (one per business line/threshold
// combo — e.g. "Oferta Máx % Desc", "Oferta TotalPrice SI") plus "RTE Approval" on WorkOrder.
// Submission is NOT something we call directly — it's an automatic Process Builder/Flow
// triggered by a field change (e.g. Quote.Status → 'Generada' once a threshold like
// QuoteLineItem.Discount__c is crossed). This helper only covers "find the resulting pending
// work item" + "approve/reject it" — the org-specific entry criteria (which fields/values
// trigger which process) must be discovered per flow.

/** Polls for a Pending ProcessInstance + its Workitem on the given record. */
export async function waitForPendingApproval(
  targetObjectId: string,
  { maxAttempts = 10, delayMs = 3000 }: { maxAttempts?: number; delayMs?: number } = {},
): Promise<PendingApproval> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const [instance] = await sfQuery.query<{ Id: string; ProcessDefinition: { Name: string } }>(
      `SELECT Id, ProcessDefinition.Name FROM ProcessInstance
       WHERE TargetObjectId = '${targetObjectId}' AND Status = 'Pending'
       ORDER BY CreatedDate DESC LIMIT 1`,
    );
    if (instance) {
      const [workItem] = await sfQuery.query<{ Id: string }>(
        `SELECT Id FROM ProcessInstanceWorkitem WHERE ProcessInstanceId = '${instance.Id}' LIMIT 1`,
      );
      if (workItem) {
        return { instanceId: instance.Id, workItemId: workItem.Id, processName: instance.ProcessDefinition.Name };
      }
    }
    console.log(`[approval] esperar Pending ProcessInstance — intento ${attempt}/${maxAttempts}`);
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`No pending approval found for ${targetObjectId} after ${maxAttempts} attempts`);
}

async function submitApprovalAction(
  actionType: 'Approve' | 'Reject',
  workItemId: string,
  comments:   string,
): Promise<ApprovalActionResult> {
  const token = await getAccessToken();
  const response = await pactum.spec()
    .post(`${INSTANCE_URL}/services/data/${API_VERSION}/process/approvals/`)
    .withHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })
    .withBody({ requests: [{ actionType, contextId: workItemId, comments }] })
    .expectStatus(200)
    .toss();

  const [result] = (response.body as ApprovalActionResult[]);
  if (!result.success) {
    throw new Error(`Approval ${actionType} failed for workitem ${workItemId}: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

export async function approveWorkItem(workItemId: string, comments = 'Aprobado — E2E'): Promise<ApprovalActionResult> {
  return submitApprovalAction('Approve', workItemId, comments);
}

export async function rejectWorkItem(workItemId: string, comments = 'Rechazado — E2E'): Promise<ApprovalActionResult> {
  return submitApprovalAction('Reject', workItemId, comments);
}
