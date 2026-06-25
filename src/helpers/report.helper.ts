import * as fs   from 'fs';
import * as path from 'path';

export interface Step {
  name:       string;
  data?:      Record<string, string | undefined>;
  status:     'ok' | 'fail';
  durationMs: number;
}

interface SerializedTest {
  title:      string;
  startTime:  string;
  durationMs: number;
  passed:     boolean;
  steps:      Step[];
}

interface SerializedSuite {
  suiteName:  string;
  section:    string;
  startTime:  string;
  endTime:    string;
  tests:      SerializedTest[];
}

export class TestReport {
  readonly title:     string;
  readonly startTime: Date;
  private  _steps:    Step[]  = [];
  private  endTime?:  Date;
  private  lastTs:    number;

  constructor(title: string) {
    this.title     = title;
    this.startTime = new Date();
    this.lastTs    = Date.now();
  }

  step(name: string, data?: Record<string, string | undefined>, status: 'ok' | 'fail' = 'ok'): void {
    const now = Date.now();
    this._steps.push({ name, data, status, durationMs: now - this.lastTs });
    this.lastTs = now;
  }

  finish(): void { this.endTime = new Date(); }

  get durationMs(): number { return (this.endTime?.getTime() ?? Date.now()) - this.startTime.getTime(); }
  get passed():     boolean { return this._steps.every(s => s.status === 'ok'); }
  get steps():      Step[]  { return this._steps; }
}

// ─── HTML helpers ────────────────────────────────────────────────────────────

function renderStep(s: Step, i: number): string {
  const stepCls  = s.status === 'ok' ? 'step-ok' : 'step-fail';
  const stepIcon = s.status === 'ok' ? '✓' : '✗';
  const stepDur  = s.durationMs >= 1000
    ? `${(s.durationMs / 1000).toFixed(1)}s`
    : `${s.durationMs}ms`;
  const dataRows = s.data
    ? Object.entries(s.data)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `<tr><td class="key">${k}</td><td class="val">${v}</td></tr>`)
        .join('')
    : '';
  const dataTable = dataRows ? `<table class="data">${dataRows}</table>` : '';
  return `
    <div class="step ${stepCls}">
      <div class="step-row">
        <span class="step-num">${i + 1}</span>
        <span class="sicon ${stepCls}">${stepIcon}</span>
        <span class="step-name">${s.name}</span>
        <span class="step-dur">${stepDur}</span>
      </div>
      ${dataTable}
    </div>`;
}

function renderTestCard(t: SerializedTest, idx: number): string {
  const dur  = (t.durationMs / 1000).toFixed(1) + 's';
  const cls  = t.passed ? 'pass' : 'fail';
  const icon = t.passed ? '✓' : '✗';
  const stepsHtml = t.steps.map((s, i) => renderStep(s, i)).join('');
  return `
    <div class="test-card">
      <div class="test-header ${cls}" onclick="toggle(${idx})">
        <span class="ticon">${icon}</span>
        <span class="tname">${t.title}</span>
        <span class="tdur">${dur}</span>
        <span class="expand-btn" id="btn-${idx}">+</span>
      </div>
      <div class="test-body" id="body-${idx}">
        <div class="steps-wrap">${stepsHtml}</div>
      </div>
    </div>`;
}

function renderSectionBlock(suite: SerializedSuite, testIndexOffset: number): { html: string; count: number } {
  const passed  = suite.tests.filter(t => t.passed).length;
  const failed  = suite.tests.length - passed;
  const cardsHtml = suite.tests
    .map((t, i) => renderTestCard(t, testIndexOffset + i))
    .join('');

  const html = `
    <div class="section">
      <div class="section-hdr">
        <span class="section-name">${suite.section || suite.suiteName}</span>
        <span class="badge bp">✓ ${passed}</span>
        ${failed > 0 ? `<span class="badge bf">✗ ${failed}</span>` : ''}
        <span class="badge bi">${suite.tests.length} tests</span>
      </div>
      ${cardsHtml}
    </div>`;
  return { html, count: suite.tests.length };
}

const STYLES = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#333;padding:28px}
  .card{background:#fff;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.09);padding:28px;max-width:900px;margin:0 auto}
  h1{font-size:1.4rem;color:#1a1a2e;margin-bottom:4px}
  .subtitle{color:#888;font-size:.85rem;margin-bottom:20px}
  .summary{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
  .badge{border-radius:20px;padding:6px 16px;font-size:.82rem;font-weight:700}
  .bp{background:#e6f4ea;color:#2e7d32}
  .bf{background:#fdecea;color:#c62828}
  .bi{background:#e8f0fe;color:#1565c0}
  .bt{background:#f3e5f5;color:#6a1b9a}
  .meta{font-size:.8rem;color:#999;margin-bottom:20px}
  /* sections */
  .section{margin-bottom:24px}
  .section-hdr{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:2px solid #e0e0e0;margin-bottom:12px}
  .section-name{font-weight:700;font-size:1rem;color:#1a1a2e;flex:1}
  /* test card */
  .test-card{border:1px solid #e8e8e8;border-radius:8px;margin-bottom:10px;overflow:hidden}
  .test-header{display:flex;align-items:center;gap:10px;padding:13px 18px;cursor:pointer;user-select:none;transition:background .15s}
  .test-header:hover{background:#f9f9f9}
  .test-header.pass{border-left:4px solid #4caf50}
  .test-header.fail{border-left:4px solid #f44336}
  .ticon{font-size:1rem;font-weight:700;width:20px;text-align:center}
  .test-header.pass .ticon{color:#4caf50}
  .test-header.fail .ticon{color:#f44336}
  .tname{flex:1;font-weight:600;font-size:.93rem}
  .tdur{color:#999;font-size:.82rem;min-width:40px;text-align:right}
  .expand-btn{margin-left:12px;width:24px;height:24px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#555;flex-shrink:0}
  /* accordion body */
  .test-body{max-height:0;overflow:hidden;transition:max-height .3s ease}
  .test-body.open{max-height:2000px}
  .steps-wrap{padding:12px 18px 16px;border-top:1px solid #f0f0f0;background:#fafafa}
  /* steps */
  .step{border-left:3px solid #ccc;border-radius:4px;margin-bottom:8px;background:#fff;overflow:hidden}
  .step-ok{border-color:#81c784}
  .step-fail{border-color:#e57373}
  .step-row{display:flex;align-items:center;gap:8px;padding:8px 12px}
  .step-num{background:#ececec;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0}
  .sicon{font-size:.85rem;font-weight:700;width:16px;text-align:center}
  .step-ok .sicon{color:#4caf50}
  .step-fail .sicon{color:#f44336}
  .step-name{flex:1;font-size:.88rem;font-weight:500}
  .step-dur{color:#bbb;font-size:.78rem;min-width:40px;text-align:right}
  table.data{width:100%;border-collapse:collapse;font-size:.8rem;border-top:1px solid #f5f5f5}
  table.data td{padding:5px 12px;border-bottom:1px solid #f5f5f5}
  td.key{color:#aaa;width:180px;font-weight:500}
  td.val{font-family:'Courier New',monospace;color:#1a1a2e}
`;

const SCRIPT = `
  function toggle(idx) {
    const body = document.getElementById('body-' + idx);
    const btn  = document.getElementById('btn-' + idx);
    const open = body.classList.toggle('open');
    btn.textContent = open ? '−' : '+';
  }
`;

function buildHtml(title: string, subtitle: string, meta: string, summary: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <div class="subtitle">${subtitle}</div>
    <div class="meta">${meta}</div>
    <div class="summary">${summary}</div>
    ${body}
  </div>
  <script>${SCRIPT}</script>
</body>
</html>`;
}

// ─── SuiteReport ─────────────────────────────────────────────────────────────

export class SuiteReport {
  private tests:     TestReport[] = [];
  private startTime: Date         = new Date();

  constructor(
    private readonly suiteName: string,
    private readonly section:   string = '',
  ) {}

  add(test: TestReport): void { this.tests.push(test); }

  /** Writes a JSON snapshot for later merging into a combined report. */
  serialize(tmpDir: string): void {
    fs.mkdirSync(tmpDir, { recursive: true });
    const ts   = this.startTime.getTime();
    const name = `${this.suiteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${ts}.json`;
    const data: SerializedSuite = {
      suiteName: this.suiteName,
      section:   this.section || this.suiteName,
      startTime: this.startTime.toISOString(),
      endTime:   new Date().toISOString(),
      tests: this.tests.map(t => ({
        title:      t.title,
        startTime:  t.startTime.toISOString(),
        durationMs: t.durationMs,
        passed:     t.passed,
        steps:      t.steps,
      })),
    };
    fs.writeFileSync(path.join(tmpDir, name), JSON.stringify(data, null, 2), 'utf8');
  }

  /** Generates a standalone HTML for this suite (unchanged behaviour). */
  generate(outputDir = 'reports'): string {
    const endTime = new Date();
    const totalMs = endTime.getTime() - this.startTime.getTime();
    const passed  = this.tests.filter(t => t.passed).length;
    const failed  = this.tests.length - passed;
    const ts      = this.startTime.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `${this.suiteName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${ts}.html`;

    fs.mkdirSync(outputDir, { recursive: true });
    const filePath = path.join(outputDir, fileName);

    const serialized: SerializedSuite = {
      suiteName: this.suiteName,
      section:   this.section || this.suiteName,
      startTime: this.startTime.toISOString(),
      endTime:   endTime.toISOString(),
      tests: this.tests.map(t => ({
        title: t.title, startTime: t.startTime.toISOString(),
        durationMs: t.durationMs, passed: t.passed, steps: t.steps,
      })),
    };

    let offset = 0;
    const { html: body } = renderSectionBlock(serialized, offset);
    offset += serialized.tests.length;

    const meta     = `Inicio: ${this.startTime.toLocaleString('es-ES')} &nbsp;·&nbsp; Fin: ${endTime.toLocaleString('es-ES')} &nbsp;·&nbsp; Duración total: ${(totalMs / 1000).toFixed(1)}s`;
    const summary  = `<span class="badge bp">✓ ${passed} passed</span>${failed > 0 ? `<span class="badge bf">✗ ${failed} failed</span>` : ''}<span class="badge bi">${this.tests.length} tests</span><span class="badge bt">${this.tests.reduce((a, t) => a + t.steps.length, 0)} steps</span>`;
    const html     = buildHtml(this.suiteName, 'Salesforce QA — Ejecución automatizada', meta, summary, body);

    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  /** Reads all JSON snapshots from tmpDir and generates a single combined HTML. */
  static mergeAndGenerate(tmpDir: string, outputDir: string): string | null {
    if (!fs.existsSync(tmpDir)) return null;

    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) return null;

    const suites: SerializedSuite[] = files
      .map(f => JSON.parse(fs.readFileSync(path.join(tmpDir, f), 'utf8')) as SerializedSuite)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const totalTests  = suites.reduce((n, s) => n + s.tests.length, 0);
    const totalPassed = suites.reduce((n, s) => n + s.tests.filter(t => t.passed).length, 0);
    const totalFailed = totalTests - totalPassed;
    const totalSteps  = suites.reduce((n, s) => n + s.tests.reduce((m, t) => m + t.steps.length, 0), 0);
    const runStart = new Date(Math.min(...suites.map(s => new Date(s.startTime).getTime())));
    const runEnd   = new Date(Math.max(...suites.map(s => new Date(s.endTime).getTime())));
    const totalMs  = suites.reduce((acc, s) => acc + s.tests.reduce((a, t) => a + t.durationMs, 0), 0);

    let offset    = 0;
    let bodyHtml  = '';
    for (const suite of suites) {
      const { html, count } = renderSectionBlock(suite, offset);
      bodyHtml += html;
      offset   += count;
    }

    const ts       = runStart.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `e2e_${ts}.html`;
    const filePath = path.join(outputDir, fileName);
    fs.mkdirSync(outputDir, { recursive: true });

    const meta    = `Inicio: ${runStart.toLocaleString('es-ES')} &nbsp;·&nbsp; Fin: ${runEnd.toLocaleString('es-ES')} &nbsp;·&nbsp; Duración total: ${(totalMs / 1000).toFixed(1)}s`;
    const summary = `<span class="badge bp">✓ ${totalPassed} passed</span>${totalFailed > 0 ? `<span class="badge bf">✗ ${totalFailed} failed</span>` : ''}<span class="badge bi">${totalTests} tests</span><span class="badge bt">${totalSteps} steps</span>`;
    const html    = buildHtml('E2E Salesforce QA', 'Salesforce QA — Ejecución automatizada', meta, summary, bodyHtml);

    fs.writeFileSync(filePath, html, 'utf8');

    // clean up temp files
    files.forEach(f => { try { fs.unlinkSync(path.join(tmpDir, f)); } catch { /* ignore */ } });

    return filePath;
  }
}
