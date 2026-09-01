import { randomBytes } from 'node:crypto';
import { hashToken } from './auth.mjs';

export function createActionToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export async function storeActionToken(client, userId, purpose, ttlMinutes) {
  const generated = createActionToken();
  await client.query(
    `UPDATE auth_action_tokens SET consumed_at=now()
     WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL`,
    [userId, purpose],
  );
  await client.query(
    `INSERT INTO auth_action_tokens(user_id,token_hash,purpose,expires_at)
     VALUES($1,$2,$3,now()+make_interval(mins=>$4))`,
    [userId, generated.hash, purpose, ttlMinutes],
  );
  return generated.token;
}

export async function sendTransactionalEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'test') {
      console.log('email suppressed in test', { to, subject });
      return;
    }
    throw Object.assign(new Error('Transactional email is not configured'), { status: 503 });
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email delivery failed: ${response.status} ${body.slice(0, 200)}`);
  }
}

export function actionUrl(path, token) {
  const base = String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base && process.env.NODE_ENV !== 'test') {
    throw Object.assign(new Error('PUBLIC_APP_URL is required for account email links'), { status: 503 });
  }
  return `${base || 'http://127.0.0.1:8080'}${path}?token=${encodeURIComponent(token)}`;
}
