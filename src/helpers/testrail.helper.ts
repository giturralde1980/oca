import https from 'https';
import { URL } from 'url';

const BASE_URL = process.env.TESTRAIL_URL ?? '';
const USER     = process.env.TESTRAIL_USER ?? '';
const API_KEY  = process.env.TESTRAIL_API_KEY ?? '';

export const TESTRAIL_PROJECT_ID = 2;
export const TESTRAIL_SUITE_ID   = 6;

// Maps Jest test title → TestRail case ID
export const CASE_MAP: Record<string, number> = {
  'IDI → Won → Firmada':                                           106,
  'IDI → Generada → Won → Rechazada':                             107,
  'IDI → Won → Cancelada':                                        108,
  'Industria → Won → Order SAP → Service Appointment → Dispatched': 109,
};

export const STATUS = { PASSED: 1, FAILED: 5, SKIPPED: 4 } as const;

function token(): string {
  return Buffer.from(`${USER}:${API_KEY}`).toString('base64');
}

function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!BASE_URL) return reject(new Error('TESTRAIL_URL not set'));
    const url  = new URL(`/index.php?/api/v2/${path}`, BASE_URL);
    const data = body ? JSON.stringify(body) : undefined;
    const req  = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method,
        headers: {
          Authorization:  `Basic ${token()}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode < 300) {
            resolve(d ? (JSON.parse(d) as T) : ({} as T));
          } else {
            reject(new Error(`TestRail ${method} ${path} → HTTP ${res.statusCode}: ${d}`));
          }
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export interface TestRailRun {
  id:   number;
  name: string;
  url:  string;
}

export async function createRun(name: string, caseIds: number[]): Promise<TestRailRun> {
  return request<TestRailRun>('POST', `add_run/${TESTRAIL_PROJECT_ID}`, {
    suite_id:   TESTRAIL_SUITE_ID,
    name,
    description: `Ejecución automática — ${new Date().toISOString()}`,
    case_ids:   caseIds,
    include_all: false,
  });
}

export async function addResult(runId: number, caseId: number, status: number, comment?: string): Promise<void> {
  await request('POST', `add_result_for_case/${runId}/${caseId}`, { status_id: status, comment });
}

export async function closeRun(runId: number): Promise<void> {
  await request('POST', `close_run/${runId}`, {});
}
