import pactum from 'pactum';

let accessToken: string | null = null;

const SF_TOKEN_URL = process.env.SF_BASE_URL || '';
const SF_CLIENT_ID = process.env.SF_CLIENT_ID || '';
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET || '';

export async function getAccessToken(): Promise<string> {
  if (accessToken) return accessToken;

  const response = await pactum.spec()
    .post(SF_TOKEN_URL)
    .withForm({
      grant_type: 'client_credentials',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
    })
    .returns('access_token');

  accessToken = response as string;
  return accessToken;
}

export function resetToken(): void {
  accessToken = null;
}
