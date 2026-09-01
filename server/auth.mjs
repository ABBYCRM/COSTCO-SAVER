import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_DAYS = 30;

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10) {
    throw new Error('Password must contain at least 10 characters');
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${Buffer.from(derived).toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [kind, saltHex, hashHex] = String(encoded).split('$');
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), 64));
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function signAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role || 'shopper',
      iat: now,
      exp: now + ACCESS_TTL_SECONDS,
      iss: 'costco-saver',
    }),
  );
  const signature = createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token) {
  const [header, payload, signature] = String(token || '').split('.');
  if (!header || !payload || !signature) throw new Error('Invalid access token');
  const expected = createHmac('sha256', jwtSecret())
    .update(`${header}.${payload}`)
    .digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid access token');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (decoded.iss !== 'costco-saver' || !decoded.sub || decoded.exp <= now) {
    throw new Error('Expired or invalid access token');
  }
  return decoded;
}

export function newRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export async function issueSession(client, user, metadata = {}) {
  const accessToken = signAccessToken(user);
  const refresh = newRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000).toISOString();

  await client.query(
    `INSERT INTO refresh_tokens
      (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      user.id,
      refresh.hash,
      expiresAt,
      metadata.userAgent || null,
      metadata.ipAddress || null,
    ],
  );

  return {
    accessToken,
    refreshToken: refresh.token,
    expiresIn: ACCESS_TTL_SECONDS,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || null,
      role: user.role || 'shopper',
    },
  };
}
