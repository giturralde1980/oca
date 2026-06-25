import https from 'https';
import { URL } from 'url';

interface SoqlResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  errorCode?: string;
  message?: string;
}

function request(
  method: 'GET' | 'POST',
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: body ? { ...headers, 'Content-Length': Buffer.byteLength(body) } : headers,
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new Error(`Non-JSON ${method} response from ${url} (status ${res.statusCode})`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Calls Salesforce REST API directly (bypassing Mulesoft).
 * All env vars are read lazily so this is safe to import before dotenv loads.
 * Maintains its own token cache, independent of the e2e auth helper.
 */
export class SalesforceQueryHelper {
  private cachedToken: string | null = null;

  private get tokenUrl():     string { return process.env.SF_BASE_URL      || ''; }
  private get clientId():     string { return process.env.SF_CLIENT_ID     || ''; }
  private get clientSecret(): string { return process.env.SF_CLIENT_SECRET || ''; }
  private get apiVersion():   string { return process.env.SF_API_VERSION   || 'v59.0'; }

  private get instanceUrl(): string {
    const base = this.tokenUrl;
    if (!base) throw new Error('SF_BASE_URL is not set');
    return new URL(base).origin;
  }

  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    const body = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     this.clientId,
      client_secret: this.clientSecret,
    }).toString();

    const result = await request('POST', this.tokenUrl, {
      'Content-Type': 'application/x-www-form-urlencoded',
    }, body) as { access_token?: string; error?: string; error_description?: string };

    if (!result.access_token) {
      throw new Error(`Salesforce auth failed: ${result.error} — ${result.error_description}`);
    }

    this.cachedToken = result.access_token;
    return this.cachedToken;
  }

  async describeFields(
    objectName: string,
    filter: (f: { name: string; label: string; updateable: boolean }) => boolean = () => true,
  ): Promise<{ name: string; label: string; updateable: boolean }[]> {
    const token = await this.getToken();
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${objectName}/describe`;
    const result = await request('GET', url, { Authorization: `Bearer ${token}` }) as { fields: { name: string; label: string; updateable: boolean }[] };
    return (result.fields ?? []).filter(filter);
  }

  async query<T = Record<string, unknown>>(soql: string): Promise<T[]> {
    const token = await this.getToken();
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/query?q=${encodeURIComponent(soql)}`;
    const result = await request('GET', url, { Authorization: `Bearer ${token}` }) as SoqlResponse<T>;

    if (result.errorCode) {
      throw new Error(`SOQL error [${result.errorCode}]: ${result.message}\nQuery: ${soql}`);
    }

    return result.records ?? [];
  }

  async findOne<T = Record<string, unknown>>(soql: string): Promise<T | null> {
    const records = await this.query<T>(soql);
    return records[0] ?? null;
  }

  // ── Accounts ────────────────────────────────────────────────────────────────

  /** Account con AccountNumber (= sincronizado con ERP/SAP) */
  async findAccountWithErpData() {
    return this.findOne<{ Id: string; AccountNumber: string; Name: string }>(
      `SELECT Id, AccountNumber, Name FROM Account
       WHERE AccountNumber != null AND IsDeleted = false
       ORDER BY LastModifiedDate DESC LIMIT 1`,
    );
  }

  /** Account de tipo Pagador — ajusta DeveloperName si el RT tiene otro nombre */
  async findPayerAccount() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Account
       WHERE RecordType.DeveloperName = 'Pagador' AND IsDeleted = false LIMIT 1`,
    );
  }

  /** Account de tipo Proveedor */
  async findProviderAccount() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Account
       WHERE RecordType.DeveloperName = 'Proveedor' AND IsDeleted = false LIMIT 1`,
    );
  }

  /** CIF / NIF de un Account — ajusta el nombre del campo si es distinto */
  async findAccountCif() {
    return this.findOne<{ Id: string; NIF__c: string; Name: string }>(
      `SELECT Id, NIF__c, Name FROM Account
       WHERE NIF__c != null AND IsDeleted = false LIMIT 1`,
    );
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /** Pedido de compra — ajusta DeveloperName del RecordType */
  async findOrderPurchase() {
    return this.findOne<{ Id: string; OrderNumber: string }>(
      `SELECT Id, OrderNumber FROM Order
       WHERE RecordType.DeveloperName LIKE '%Compra%' AND Status != 'Cancelled' LIMIT 1`,
    );
  }

  /** Pedido de venta */
  async findOrderSales() {
    return this.findOne<{ Id: string; OrderNumber: string }>(
      `SELECT Id, OrderNumber FROM Order
       WHERE RecordType.DeveloperName LIKE '%Venta%' AND Status != 'Cancelled' LIMIT 1`,
    );
  }

  // ── Invoice ─────────────────────────────────────────────────────────────────

  /** Factura — ajusta el API name del objeto si no es Invoice__c */
  async findInvoice() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Invoice__c
       WHERE IsDeleted = false ORDER BY CreatedDate DESC LIMIT 1`,
    );
  }

  // ── Document ─────────────────────────────────────────────────────────────────

  /** ContentDocument (fichero adjunto en SF) */
  async findDocument() {
    return this.findOne<{ Id: string; Title: string }>(
      `SELECT Id, Title FROM ContentDocument
       WHERE IsDeleted = false ORDER BY CreatedDate DESC LIMIT 1`,
    );
  }

  // ── Expedient IDI ────────────────────────────────────────────────────────────

  /** Ajusta el API name si el objeto es distinto */
  async findExpedientIdi() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM ExpedienteIDI__c WHERE IsDeleted = false LIMIT 1`,
    );
  }

  // ── Prevengos ────────────────────────────────────────────────────────────────

  /** Empresa de prevengos — puede ser un RT de Account u objeto propio */
  async findPrevengosEmpresa() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Account
       WHERE RecordType.DeveloperName = 'Empresa' AND IsDeleted = false LIMIT 1`,
    );
  }

  /** Contrato de prevengos */
  async findPrevengosContrato() {
    return this.findOne<{ Id: string; ContractNumber: string }>(
      `SELECT Id, ContractNumber FROM Contract
       WHERE Status = 'Activated' AND IsDeleted = false LIMIT 1`,
    );
  }

  /** Contacto de prevengos */
  async findPrevengosContacto() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Contact WHERE IsDeleted = false LIMIT 1`,
    );
  }

  /** Centro — ajusta el API name del objeto */
  async findPrevengosCentro() {
    return this.findOne<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM Centro__c WHERE IsDeleted = false LIMIT 1`,
    );
  }

  /** Línea de contrato */
  async findPrevengosLineaContrato() {
    return this.findOne<{ Id: string }>(
      `SELECT Id FROM ContractLineItem WHERE IsDeleted = false LIMIT 1`,
    );
  }
}

export const sfQuery = new SalesforceQueryHelper();
