/**
 * Calls every inbound GET endpoint and generates an HTML report.
 *
 * Usage:
 *   node node_modules/ts-node/dist/bin.js src/scripts/probe-inbound.ts [env]
 *
 * Output: reports/probe-inbound-<env>.html
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { URL } from 'url';

const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

const BASE   = process.env.INBOUND_BASE_URL    || '';
const CID    = process.env.INBOUND_CLIENT_ID   || '';
const CSEC   = process.env.INBOUND_CLIENT_SECRET || '';

// ─── HTTP ────────────────────────────────────────────────────────────────────

interface Result { status: number; body: unknown; raw: string; }

function get(url: string): Promise<Result> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json', client_id: CID, client_secret: CSEC },
    }, res => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body: unknown;
        try { body = JSON.parse(raw); } catch { body = raw || null; }
        resolve({ status: res.statusCode ?? 0, body, raw });
      });
    }).on('error', reject);
  });
}

function qs(params: Record<string, string>): string {
  const p = Object.entries(params).filter(([, v]) => v);
  return p.length ? '?' + p.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

const e = process.env;

interface Probe { label: string; path: string; params: Record<string, string>; }

const probes: Probe[] = [
  { label: 'GET /account',                    path: '/account',                     params: { accountId: e.INBOUND_TEST_ACCOUNT_ID || '' } },
  { label: 'GET /payer',                      path: '/payer',                       params: { accountId: e.INBOUND_TEST_PAYER_ACCOUNT_ID || '' } },
  { label: 'GET /provider',                   path: '/provider',                    params: { providerId: e.INBOUND_TEST_PROVIDER_ID || '' } },
  { label: 'GET /order-purchase',             path: '/order-purchase',              params: { orderPurchaseId: e.INBOUND_TEST_ORDER_PURCHASE_ID || '' } },
  { label: 'GET /order-sales',                path: '/order-sales',                 params: { orderSalesId: e.INBOUND_TEST_ORDER_SALES_ID || '' } },
  { label: 'GET /delivery-note',              path: '/delivery-note',               params: { orderSalesId: e.INBOUND_TEST_ORDER_SALES_ID || '' } },
  { label: 'GET /document (DWR)',             path: '/document',                    params: { id: e.INBOUND_TEST_DOCUMENT_ID || '', systemOrigin: 'DWR' } },
  { label: 'GET /document (DWR+visibility)',  path: '/document',                    params: { id: e.INBOUND_TEST_DOCUMENT_ID || '', systemOrigin: 'DWR', visibility: 'public' } },
  { label: 'GET /document (DMS)',             path: '/document',                    params: { id: e.INBOUND_TEST_DOCUMENT_ID || '', systemOrigin: 'DMS' } },
  { label: 'GET /invoice',                    path: '/invoice',                     params: { invoiceId: e.INBOUND_TEST_INVOICE_ID || '' } },
  { label: 'GET /invoices/{id}/sync',         path: `/invoices/${e.INBOUND_TEST_INVOICE_SF_ID || '_MISSING_'}/sync`, params: {} },
  { label: 'GET /delegacion',                 path: '/delegacion',                  params: {} },
  { label: 'GET /prevengos/version',          path: '/prevengos/version',           params: {} },
  { label: 'GET /prevengos/serviceAppointments',               path: '/prevengos/serviceAppointments', params: {} },
  { label: 'GET /prevengos/serviceAppointments (CIF)',         path: '/prevengos/serviceAppointments', params: { cif: e.INBOUND_TEST_CIF || '' } },
  { label: 'GET /prevengos/serviceAppointments (date range)',  path: '/prevengos/serviceAppointments', params: { startDate: e.INBOUND_TEST_START_DATE || '', endDate: e.INBOUND_TEST_END_DATE || '' } },
];

// ─── HTML ────────────────────────────────────────────────────────────────────

function statusColor(s: number): string {
  if (s >= 200 && s < 300) return '#1a7f37';
  if (s >= 400 && s < 500) return '#b45309';
  return '#cf222e';
}

function badge(s: number): string {
  return `<span style="background:${statusColor(s)};color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold;font-size:13px">${s}</span>`;
}

function buildHtml(rows: Array<{ probe: Probe; result: Result; url: string }>): string {
  const now = new Date().toLocaleString('es-ES');
  const items = rows.map(({ probe, result, url }) => {
    const params = Object.entries(probe.params)
      .map(([k, v]) => `<tr><td style="color:#666;padding:2px 8px 2px 0">${k}</td><td><code>${v || '<em style="color:#aaa">vacío</em>'}</code></td></tr>`)
      .join('');
    const bodyStr = result.body === null
      ? '<em style="color:#aaa">(vacío)</em>'
      : `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:12px">${JSON.stringify(result.body, null, 2)}</pre>`;

    return `
    <div style="border:1px solid #d0d7de;border-radius:6px;margin-bottom:16px;overflow:hidden">
      <div style="background:#f6f8fa;padding:10px 16px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #d0d7de">
        ${badge(result.status)}
        <strong style="font-size:14px">${probe.label}</strong>
      </div>
      <div style="padding:12px 16px">
        <div style="margin-bottom:8px">
          <span style="font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px">URL</span><br>
          <code style="font-size:12px;word-break:break-all">${url}</code>
        </div>
        ${params ? `<div style="margin-bottom:8px"><span style="font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px">Parámetros</span><table style="margin-top:4px;font-size:13px">${params}</table></div>` : ''}
        <div>
          <span style="font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.5px">Respuesta</span>
          <div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:4px;padding:10px;margin-top:4px">${bodyStr}</div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Inbound API Probe — ${env.toUpperCase()}</title>
  <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:960px;margin:40px auto;padding:0 20px;color:#24292f} code{background:#f6f8fa;padding:1px 4px;border-radius:3px;font-family:'SFMono-Regular',Consolas,monospace}</style>
</head>
<body>
  <h1 style="border-bottom:1px solid #d0d7de;padding-bottom:12px">Inbound API Probe — ${env.toUpperCase()}</h1>
  <p style="color:#666;margin-top:-8px">Generado: ${now} &nbsp;·&nbsp; Base URL: <code>${BASE}</code></p>
  ${items}
</body>
</html>`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nProbing inbound GET endpoints [${env.toUpperCase()}]...\n`);

  const rows: Array<{ probe: Probe; result: Result; url: string }> = [];

  for (const probe of probes) {
    const url = BASE + probe.path + qs(probe.params);
    process.stdout.write(`  ${probe.label}... `);
    try {
      const result = await get(url);
      const icon = result.status >= 200 && result.status < 300 ? '✓' : '✗';
      console.log(`${icon} ${result.status}`);
      rows.push({ probe, result, url });
    } catch (err: unknown) {
      console.log(`ERR ${(err as Error).message}`);
      rows.push({ probe, result: { status: 0, body: (err as Error).message, raw: '' }, url });
    }
  }

  const html = buildHtml(rows);
  const outDir = path.resolve(__dirname, '../../reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `probe-inbound-${env}.html`);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`\nReport saved: ${outPath}\n`);
}

main().catch(e => { console.error('Fatal:', (e as Error).message); process.exit(1); });
