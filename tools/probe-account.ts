/**
 * Discovery script for GET /account.
 * Tries different parameter names and ID formats and prints each result.
 *
 * Usage:
 *   node node_modules/ts-node/dist/bin.js src/scripts/probe-account.ts [env]
 */

import dotenv from 'dotenv';
import path from 'path';
import https from 'https';
import { URL } from 'url';

const env = process.argv[2] ?? 'qa';
dotenv.config({ path: path.resolve(__dirname, `../../.env.${env}`) });

const BASE_URL  = process.env.INBOUND_BASE_URL   || '';
const CLIENT_ID = process.env.INBOUND_CLIENT_ID  || '';
const CLIENT_SECRET = process.env.INBOUND_CLIENT_SECRET || '';

// ─── HTTP helper ─────────────────────────────────────────────────────────────

interface HttpResult {
  status: number;
  body: string;
  contentType: string;
}

function get(url: string): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'Content-Type': 'application/json',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode ?? 0,
        body: Buffer.concat(chunks).toString('utf8'),
        contentType: String(res.headers['content-type'] ?? ''),
      }));
    }).on('error', reject);
  });
}

function prettyBody(raw: string): string {
  try   { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw || '(empty)'; }
}

// ─── Probe variants ───────────────────────────────────────────────────────────

interface Probe {
  label: string;
  url: string;
}

// AccountNumber from SF QA: 1504645 (Movilidad OCA)
const SF_ACCOUNT_ID  = '001JW000008sx3aYAA';
const ERP_ACCOUNT_NR = '1504645';
const ERP_PADDED     = ERP_ACCOUNT_NR.padStart(10, '0');   // SAP 10-digit format

const probes: Probe[] = [
  // ── query param name variations ──────────────────────────────────────────
  { label: 'accountid (lowercase)  + ERP number',    url: `${BASE_URL}/account?accountid=${ERP_ACCOUNT_NR}` },
  { label: 'accountId (camelCase)  + ERP number',    url: `${BASE_URL}/account?accountId=${ERP_ACCOUNT_NR}` },
  { label: 'accountid (lowercase)  + ERP 0-padded',  url: `${BASE_URL}/account?accountid=${ERP_PADDED}` },
  { label: 'accountId (camelCase)  + ERP 0-padded',  url: `${BASE_URL}/account?accountId=${ERP_PADDED}` },
  { label: 'accountid (lowercase)  + SF record Id',  url: `${BASE_URL}/account?accountid=${SF_ACCOUNT_ID}` },
  { label: 'accountId (camelCase)  + SF record Id',  url: `${BASE_URL}/account?accountId=${SF_ACCOUNT_ID}` },
  // ── path param ───────────────────────────────────────────────────────────
  { label: 'path param             + ERP number',    url: `${BASE_URL}/account/${ERP_ACCOUNT_NR}` },
  { label: 'path param             + SF record Id',  url: `${BASE_URL}/account/${SF_ACCOUNT_ID}` },
  // ── no param ─────────────────────────────────────────────────────────────
  { label: 'no params (list all?)',                  url: `${BASE_URL}/account` },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\nProbing GET /account [${env.toUpperCase()}]\n`);
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  client_id: ${CLIENT_ID.slice(0, 8)}...\n`);
  console.log('='.repeat(72));

  for (const { label, url } of probes) {
    const result = await get(url);
    const icon = result.status === 200 ? '✓' : '✗';
    console.log(`\n${icon}  [${result.status}]  ${label}`);
    console.log(`   URL: ${url}`);
    console.log(`   Body:\n${prettyBody(result.body).split('\n').map(l => '     ' + l).join('\n')}`);
  }

  console.log('\n' + '='.repeat(72) + '\n');
}

main().catch((e) => {
  console.error('Fatal:', (e as Error).message);
  process.exit(1);
});
