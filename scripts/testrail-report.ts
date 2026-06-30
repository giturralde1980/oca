/**
 * Reads Jest JSON results and posts them to TestRail.
 *
 * Test cases are matched via @C<id> tag in the test title:
 *   it('[e2e] @C106 IDI → Won → Firmada', ...)
 *
 * - If @C tag is present → uses that case ID directly.
 * - If no @C tag → searches by title in section e2e; creates the case if missing
 *   and prints the ID to add to the test file.
 * - A new Test Execution (run) is always created and closed with the results.
 *
 * Usage:
 *   TEST_ENV=qa npx ts-node --skipProject --compiler-options '{"module":"commonjs"}' scripts/testrail-report.ts [results.json]
 */

import * as dotenv from 'dotenv';
import * as https   from 'https';
import * as fs      from 'fs';
import * as path    from 'path';
import { URL }      from 'url';

// Load env file: .env.qa, .env.int, etc.
dotenv.config({ path: `.env.${process.env.TEST_ENV ?? 'qa'}` });

const TESTRAIL_URL = process.env.TESTRAIL_URL ?? '';
const USER         = process.env.TESTRAIL_USER ?? '';
const API_KEY      = process.env.TESTRAIL_API_KEY ?? '';
const PROJECT_ID   = 2;
const SUITE_ID     = 6;
const SECTION_ID   = 74;  // Transversal > e2e
const TEST_ENV     = process.env.TEST_ENV ?? 'qa';

const TR_STATUS: Record<string, number> = { passed: 7, failed: 8, pending: 4 };

if (!TESTRAIL_URL || !USER || !API_KEY) {
  console.error('❌  Faltan variables: TESTRAIL_URL, TESTRAIL_USER, TESTRAIL_API_KEY');
  process.exit(1);
}

const authToken = Buffer.from(`${USER}:${API_KEY}`).toString('base64');

function tr<T>(method: 'GET' | 'POST', apiPath: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const url  = new URL(`/index.php?/api/v2/${apiPath}`, TESTRAIL_URL);
    const data = body ? JSON.stringify(body) : undefined;
    const req  = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method,
        headers: {
          Authorization:  `Basic ${authToken}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () =>
          (res.statusCode ?? 0) < 300
            ? resolve(d ? (JSON.parse(d) as T) : ({} as T))
            : reject(new Error(`TestRail ${method} ${apiPath} → HTTP ${res.statusCode}: ${d}`)),
        );
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

interface TRCase  { id: number; title: string }
interface TRRun   { id: number; url: string }

function extractCaseId(title: string): number | null {
  const match = title.match(/@C(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function stripTags(title: string): string {
  return title.replace(/@C\d+\s*/g, '').trim();
}

async function getOrCreateCase(existing: TRCase[], rawTitle: string): Promise<number> {
  const caseId = extractCaseId(rawTitle);
  if (caseId) {
    // Verify the case still exists in TestRail; if somehow deleted, warn but continue
    const exists = existing.some((c) => c.id === caseId);
    if (!exists) console.log(`  ⚠️  C${caseId} no encontrado en TestRail — puede haber sido eliminado.`);
    return caseId;
  }

  // No tag — search by clean title
  const cleanTitle = stripTags(rawTitle);
  const found = existing.find((c) => c.title === cleanTitle);
  if (found) {
    console.log(`  ⚠️  Sin @C tag — usando C${found.id} existente. Añade @C${found.id} al test.`);
    return found.id;
  }

  // Create new case
  const created = await tr<TRCase>('POST', `add_case/${SECTION_ID}`, {
    title:       cleanTitle,
    type_id:     3,  // Automated
    priority_id: 2,
  });
  console.log(`  ✨ Case creado: C${created.id} — "${cleanTitle}". Añade @C${created.id} al test.`);
  return created.id;
}

async function main(): Promise<void> {
  const resultsPath = process.argv[2] ?? path.join('reports', 'jest-results.json');

  if (!fs.existsSync(resultsPath)) {
    console.error(`❌  No se encuentra: ${resultsPath}`);
    process.exit(1);
  }

  const jestOutput  = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const allTests    = (jestOutput.testResults as { assertionResults?: { title: string; status: string; failureMessages?: string[] }[] }[])
    .flatMap((s) => s.assertionResults ?? []);
  const e2eTests    = allTests.filter((t) => t.title.startsWith('[e2e]'));

  if (e2eTests.length === 0) {
    console.log('No se encontraron tests [e2e].');
    process.exit(0);
  }

  // Fetch existing cases in e2e section
  console.log(`\nObteniendo cases de sección e2e (${SECTION_ID})...`);
  const resp         = await tr<{ cases?: TRCase[] } | TRCase[]>('GET', `get_cases/${PROJECT_ID}&suite_id=${SUITE_ID}&section_id=${SECTION_ID}`);
  const existingCases: TRCase[] = Array.isArray(resp) ? resp : ((resp as { cases?: TRCase[] }).cases ?? []);
  console.log(`  ${existingCases.length} cases existentes.\n`);

  // Resolve case IDs
  console.log('Resolviendo cases:');
  const toReport: { caseId: number; status: string; error?: string }[] = [];
  for (const t of e2eTests) {
    const titleNoPrefix = t.title.replace(/^\[e2e\]\s+/, '');
    const hasTag        = /@C\d+/.test(titleNoPrefix);

    // Skip pending tests without a tag (e.g. describe.skip suites)
    if (t.status === 'pending' && !hasTag) continue;

    const caseId     = await getOrCreateCase(existingCases, titleNoPrefix);
    const cleanTitle = stripTags(titleNoPrefix);

    // pending = not yet implemented — include in run but post no result (stays Untested)
    if (t.status === 'pending') {
      console.log(`  ⏭ C${caseId} — ${cleanTitle} → untested (skipped intencional)`);
      toReport.push({ caseId, status: 'pending', error: undefined });
      continue;
    }

    const icon = t.status === 'passed' ? '✅' : '❌';
    console.log(`  ${icon} C${caseId} — ${cleanTitle} → ${t.status}`);
    toReport.push({ caseId, status: t.status, error: t.failureMessages?.[0]?.slice(0, 1000) });
  }

  // Create run
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const run  = await tr<TRRun>('POST', `add_run/${PROJECT_ID}`, {
    suite_id:    SUITE_ID,
    name:        `E2E Quotes — ${TEST_ENV.toUpperCase()} — ${date}`,
    description: `Ejecución automática — ${new Date().toISOString()}`,
    case_ids:    toReport.map((r) => r.caseId),
    include_all: false,
  });
  console.log(`\n[TestRail] Run creado: ${run.url}`);

  // Post results
  for (const r of toReport) {
    await tr('POST', `add_result_for_case/${run.id}/${r.caseId}`, {
      status_id: TR_STATUS[r.status] ?? 8,
      comment:   r.error,
    });
  }

  // Close run
  await tr('POST', `close_run/${run.id}`, {});
  console.log(`[TestRail] Run cerrado ✓`);
  console.log(`\nVer resultados: ${run.url}`);
}

main().catch((err: Error) => {
  console.error('❌ ', err.message);
  process.exit(1);
});
