import { verifyAccessToken } from './auth.mjs';

export function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

export function sendError(res, status, code, message, requestId) {
  sendJson(res, status, { error: { code, message, requestId } });
}

export async function readJson(req, maxBytes = 1_000_000) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw Object.assign(new Error('Request body too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

export function getBearer(req) {
  const value = req.headers.authorization || '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}

export function requireUser(req) {
  const token = getBearer(req);
  if (!token) throw Object.assign(new Error('Authentication required'), { status: 401 });
  try {
    return verifyAccessToken(token);
  } catch {
    throw Object.assign(new Error('Invalid or expired session'), { status: 401 });
  }
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || null;
}

export function parseUrl(req) {
  return new URL(req.url || '/', 'http://localhost');
}

export function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value));
}

export function cents(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw Object.assign(new Error('Invalid money value'), { status: 400 });
  return n;
}
