import crypto from 'crypto';

const getSecret = () => {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) throw new Error('AUTH0_SECRET is not configured');
  return secret;
};

/**
 * Sign a lightweight JWT for the Chrome extension.
 * Uses HMAC-SHA256 with AUTH0_SECRET — no extra dependencies.
 * Tokens expire after 30 days.
 */
export function signExtensionToken(payload: Record<string, unknown>): string {
  const secret = getSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Verify an extension JWT token.
 * Returns the decoded payload or throws on invalid / expired tokens.
 */
export function verifyExtensionToken(token: string): Record<string, unknown> {
  const secret = getSecret();
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [header, body, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  if (signature !== expectedSig) throw new Error('Invalid token signature');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}
