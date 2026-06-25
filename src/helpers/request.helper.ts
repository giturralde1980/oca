import pactum from 'pactum';
import { getAccessToken } from './auth.helper';

export const API_VERSION = process.env.SF_API_VERSION || 'v59.0';
// SF_BASE_URL is the token URL — extract just the origin for API calls
export const INSTANCE_URL = new URL(process.env.SF_BASE_URL || '').origin;
export const APEX_REST_URL = `${INSTANCE_URL}/services/apexrest`;

export async function setupPactum(): Promise<void> {
  pactum.request.setDefaultTimeout(30000);
  const token = await getAccessToken();
  pactum.request.setBaseUrl(`${INSTANCE_URL}/services/data/${API_VERSION}`);
  pactum.request.setDefaultHeaders({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });
}
