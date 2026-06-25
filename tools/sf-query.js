#!/usr/bin/env node
/**
 * sf-query.js — lightweight SOQL runner with token cache
 * Usage:  node scripts/sf-query.js "SELECT Id, Status FROM Quote LIMIT 5"
 */
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const qs     = require('querystring');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.qa') });

const TOKEN_CACHE = path.resolve(__dirname, '../.sf_token_cache.json');
const TOKEN_TTL   = 90 * 60 * 1000; // 90 min
const BASE        = new URL(process.env.SF_BASE_URL).origin;
const API         = `${BASE}/services/data/${process.env.SF_API_VERSION || 'v59.0'}`;

function httpReq(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function getToken() {
  if (fs.existsSync(TOKEN_CACHE)) {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8'));
    if (Date.now() - cached.ts < TOKEN_TTL) return cached.token;
  }
  const postData = qs.stringify({
    grant_type:    'client_credentials',
    client_id:     process.env.SF_CLIENT_ID,
    client_secret: process.env.SF_CLIENT_SECRET,
  });
  const url      = new URL(process.env.SF_BASE_URL);
  const resp     = await httpReq({
    hostname: url.hostname,
    path:     url.pathname,
    method:   'POST',
    headers:  { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': postData.length },
  }, postData);
  const token = resp.access_token;
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token, ts: Date.now() }), 'utf8');
  console.error('[sf-query] new token obtained and cached');
  return token;
}

async function query(soql) {
  const token = await getToken();
  const url   = new URL(API);
  const resp  = await httpReq({
    hostname: url.hostname,
    path:     `/services/data/${process.env.SF_API_VERSION || 'v59.0'}/query?q=${encodeURIComponent(soql)}`,
    method:   'GET',
    headers:  { Authorization: `Bearer ${token}` },
  });
  return resp;
}

const soql = process.argv.slice(2).join(' ');
if (!soql) { console.error('Usage: node scripts/sf-query.js "<SOQL>"'); process.exit(1); }

query(soql)
  .then(r => console.log(JSON.stringify(r.records ?? r, null, 2)))
  .catch(e => { console.error(e); process.exit(1); });
