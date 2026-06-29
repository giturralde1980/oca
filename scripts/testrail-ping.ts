/**
 * TestRail API connectivity check.
 * Usage: npx ts-node scripts/testrail-ping.ts
 *
 * Required env vars (add to .env.qa):
 *   TESTRAIL_URL      → https://tuempresa.testrail.io
 *   TESTRAIL_USER     → email de login
 *   TESTRAIL_API_KEY  → generada en: Tu cuenta → Settings → API Keys
 */

import 'dotenv/config';
import https from 'https';
import { URL } from 'url';

const BASE_URL  = process.env.TESTRAIL_URL;
const USER      = process.env.TESTRAIL_USER;
const API_KEY   = process.env.TESTRAIL_API_KEY;

if (!BASE_URL || !USER || !API_KEY) {
  console.error('❌  Faltan variables de entorno: TESTRAIL_URL, TESTRAIL_USER, TESTRAIL_API_KEY');
  process.exit(1);
}

const token = Buffer.from(`${USER}:${API_KEY}`).toString('base64');

function get(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = new URL(`/index.php?/api/v2/${path}`, BASE_URL);
    https.get(
      { hostname: url.hostname, path: url.pathname + url.search, headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      },
    ).on('error', reject);
  });
}

async function main() {
  console.log(`\nConectando a TestRail: ${BASE_URL}\n`);

  try {
    const projects = await get('get_projects') as { projects?: { id: number; name: string; url: string }[] } | { id: number; name: string; url: string }[];
    const list = Array.isArray(projects) ? projects : (projects as any).projects ?? [];

    console.log('✅  Conexión OK\n');
    console.log(`Proyectos encontrados: ${list.length}`);
    list.forEach((p: any) => console.log(`  [${p.id}] ${p.name}  →  ${p.url}`));
  } catch (err) {
    console.error('❌  Error al conectar:', (err as Error).message);
    process.exit(1);
  }
}

main();
