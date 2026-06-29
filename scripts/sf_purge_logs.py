#!/usr/bin/env python3
"""
Purges LogEntry__c records older than 15 days using OCA_LogBatchPurger.

Strategy:
  - Finds the oldest LogEntry__c record to know the full range to clean.
  - Splits the range into daily chunks.
  - Submits up to MAX_PARALLEL (3) jobs at a time, polls until slots free up.
  - Respects MAX_RUNTIME: if we're running long, stops and lets the next
    scheduled run pick up where this one left off.
"""

import json, os, sys, time, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone

SF_BASE_URL      = os.environ['SF_BASE_URL']
SF_CLIENT_ID     = os.environ['SF_CLIENT_ID']
SF_CLIENT_SECRET = os.environ['SF_CLIENT_SECRET']
SF_API_VERSION   = 'v59.0'
KEEP_DAYS        = 15   # keep logs from last N days
MAX_PARALLEL     = 3    # max concurrent batch jobs
POLL_INTERVAL    = 30   # seconds between status polls
MAX_RUNTIME      = 480  # 8 min max — leaves margin before GH Actions 20-min timeout


# ── Auth & helpers ─────────────────────────────────────────────────────────────

def sf_auth():
    body = urllib.parse.urlencode({
        'grant_type':    'client_credentials',
        'client_id':     SF_CLIENT_ID,
        'client_secret': SF_CLIENT_SECRET,
    }).encode()
    req  = urllib.request.Request(SF_BASE_URL, data=body, method='POST')
    auth = json.loads(urllib.request.urlopen(req).read())
    return auth['access_token'], auth['instance_url']


def sf_query(token, instance_url, soql):
    url = f"{instance_url}/services/data/{SF_API_VERSION}/query/?q={urllib.parse.quote(soql)}"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    return json.loads(urllib.request.urlopen(req).read())


def sf_execute_anonymous(token, instance_url, apex):
    encoded = urllib.parse.quote(apex)
    url = f"{instance_url}/services/data/{SF_API_VERSION}/tooling/executeAnonymous/?anonymousBody={encoded}"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    return json.loads(urllib.request.urlopen(req).read())


def count_active_purge_jobs(token, instance_url):
    soql = (
        "SELECT COUNT() FROM AsyncApexJob "
        "WHERE ApexClass.Name = 'OCA_LogBatchPurger' "
        "AND Status IN ('Queued', 'Preparing', 'Processing')"
    )
    return sf_query(token, instance_url, soql)['totalSize']


def launch_purge_job(token, instance_url, start_str: str, end_str: str):
    apex = (
        f"String fechaInicio = '{start_str}';\n"
        f"String fechaFin    = '{end_str}';\n"
        "String condition         = 'WHERE CreatedDate >= ' + fechaInicio + ' AND CreatedDate < ' + fechaFin;\n"
        "String conditionTag      = 'WHERE CreatedDate >= ' + fechaInicio + ' AND CreatedDate < ' + fechaFin;\n"
        "String conditionLogEntry = ' CreatedDate >= '      + fechaInicio + ' AND CreatedDate < ' + fechaFin;\n"
        "Database.executeBatch(new OCA_LogBatchPurger(condition, conditionTag, conditionLogEntry, false, 600));"
    )
    result = sf_execute_anonymous(token, instance_url, apex)
    if not result.get('compiled'):
        raise RuntimeError(f"Apex compile error: {result.get('compileProblem')}")
    if not result.get('success'):
        raise RuntimeError(f"Apex runtime error: {result.get('exceptionMessage')}")


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("Autenticando en Salesforce...")
    token, instance_url = sf_auth()

    today      = datetime.now(timezone.utc).date()
    purge_end  = today - timedelta(days=KEEP_DAYS)

    # Find oldest LogEntry__c to avoid creating empty jobs
    print("Buscando el LogEntry__c más antiguo...")
    result = sf_query(
        token, instance_url,
        f"SELECT Id, CreatedDate FROM LogEntry__c "
        f"WHERE CreatedDate < {purge_end.strftime('%Y-%m-%dT00:00:00Z')} "
        f"ORDER BY CreatedDate ASC LIMIT 1"
    )

    if result['totalSize'] == 0:
        print(f"✅ No hay LogEntry__c anteriores a {purge_end}. Nada que purgar.")
        sys.exit(0)

    oldest_str  = result['records'][0]['CreatedDate']  # e.g. "2025-06-01T08:00:00.000+0000"
    purge_start = datetime.fromisoformat(oldest_str.replace('+0000', '+00:00')).date()

    print(f"Rango a purgar: {purge_start} → {purge_end} ({(purge_end - purge_start).days} días)\n")

    # Build daily chunks
    chunks = []
    d = purge_start
    while d < purge_end:
        next_d = d + timedelta(days=1)
        chunks.append((
            d.strftime('%Y-%m-%dT00:00:00Z'),
            next_d.strftime('%Y-%m-%dT00:00:00Z'),
        ))
        d = next_d

    start_time = time.time()
    i          = 0
    launched   = 0

    while i < len(chunks):
        elapsed = time.time() - start_time
        if elapsed > MAX_RUNTIME:
            print(f"\n⏱ Tiempo máximo alcanzado ({MAX_RUNTIME}s). "
                  f"{len(chunks) - i} días pendientes — se retomarán en la próxima ejecución.")
            break

        active = count_active_purge_jobs(token, instance_url)
        slots  = MAX_PARALLEL - active

        if slots <= 0:
            print(f"  {active} jobs activos — esperando {POLL_INTERVAL}s...")
            time.sleep(POLL_INTERVAL)
            continue

        for _ in range(slots):
            if i >= len(chunks):
                break
            start_str, end_str = chunks[i]
            print(f"  [{i + 1}/{len(chunks)}] Lanzando job: {start_str[:10]} → {end_str[:10]}")
            launch_purge_job(token, instance_url, start_str, end_str)
            launched += 1
            i += 1
            time.sleep(2)  # small gap between submissions

    total_days = len(chunks)
    print(f"\n{'✅' if i >= total_days else '🔄'} {launched} jobs lanzados "
          f"({i}/{total_days} días procesados en esta ejecución).")


if __name__ == '__main__':
    main()
