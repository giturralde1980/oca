'use strict';

const https = require('https');
const { URL } = require('url');

const CASE_MAP = {
  'IDI → Won → Firmada':                                             106,
  'IDI → Generada → Won → Rechazada':                               107,
  'IDI → Won → Cancelada':                                          108,
  'Industria → Won → Order SAP → Service Appointment → Dispatched': 109,
};

const STATUS = { PASSED: 1, FAILED: 5, SKIPPED: 4 };

function trRequest(method, path, body) {
  const baseUrl  = process.env.TESTRAIL_URL;
  const user     = process.env.TESTRAIL_USER;
  const apiKey   = process.env.TESTRAIL_API_KEY;
  const token    = Buffer.from(`${user}:${apiKey}`).toString('base64');

  return new Promise((resolve, reject) => {
    const url  = new URL(`/index.php?/api/v2/${path}`, baseUrl);
    const data = body ? JSON.stringify(body) : undefined;
    const req  = https.request(
      {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method,
        headers: {
          Authorization:  `Basic ${token}`,
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          if (res.statusCode < 300) resolve(d ? JSON.parse(d) : {});
          else reject(new Error(`TestRail ${method} ${path} → HTTP ${res.statusCode}: ${d}`));
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

class TestRailReporter {
  constructor(_globalConfig, _options) {
    this.runId   = null;
    this.enabled = !!(
      process.env.TESTRAIL_URL &&
      process.env.TESTRAIL_USER &&
      process.env.TESTRAIL_API_KEY
    );
  }

  async onRunStart() {
    if (!this.enabled) return;
    try {
      const env  = process.env.TEST_ENV ?? 'qa';
      const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const run  = await trRequest('POST', 'add_run/2', {
        suite_id:    6,
        name:        `E2E Quotes — ${env.toUpperCase()} — ${date}`,
        description: `Ejecución automática — ${new Date().toISOString()}`,
        case_ids:    Object.values(CASE_MAP),
        include_all: false,
      });
      this.runId = run.id;
      console.log(`\n[TestRail] Run creado: ${run.url}\n`);
    } catch (err) {
      console.warn('[TestRail] No se pudo crear el run:', err.message);
    }
  }

  async onTestResult(_test, result) {
    if (!this.enabled || !this.runId) return;
    for (const t of result.testResults) {
      const title  = t.fullName.replace(/^\[e2e\]\s+/, '');
      const caseId = CASE_MAP[title];
      if (!caseId) continue;

      const status  = t.status === 'passed'  ? STATUS.PASSED
                    : t.status === 'pending' ? STATUS.SKIPPED
                    : STATUS.FAILED;

      const comment = t.status === 'failed'
        ? t.failureMessages.join('\n').slice(0, 1000)
        : undefined;

      try {
        await trRequest('POST', `add_result_for_case/${this.runId}/${caseId}`, { status_id: status, comment });
      } catch (err) {
        console.warn(`[TestRail] Error reportando C${caseId}:`, err.message);
      }
    }
  }

  async onRunComplete(_contexts, results) {
    if (!this.enabled || !this.runId) return;
    try {
      await trRequest('POST', `close_run/${this.runId}`, {});
      const { numPassedTests, numFailedTests } = results;
      console.log(`\n[TestRail] Run cerrado — ✅ ${numPassedTests} passed, ❌ ${numFailedTests} failed\n`);
    } catch (err) {
      console.warn('[TestRail] No se pudo cerrar el run:', err.message);
    }
  }
}

module.exports = TestRailReporter;
