import http2 from 'node:http2';
import { createSign, randomUUID } from 'node:crypto';
import { internalTransaction } from './db.mjs';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function apnsJwt() {
  const teamId = process.env.APNS_TEAM_ID;
  const keyId = process.env.APNS_KEY_ID;
  const privateKey = normalizePrivateKey(process.env.APNS_PRIVATE_KEY);
  if (!teamId || !keyId || !privateKey) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function sendApns(token, notification) {
  const jwt = apnsJwt();
  const topic = process.env.APNS_BUNDLE_ID;
  if (!jwt || !topic) return { ok: false, error: 'APNs credentials not configured' };

  const authority =
    process.env.APNS_ENVIRONMENT === 'production'
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com';

  return new Promise((resolve) => {
    const client = http2.connect(authority);
    const request = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-id': randomUUID(),
      'content-type': 'application/json',
    });
    let body = '';
    let status = 0;
    request.setEncoding('utf8');
    request.on('response', (headers) => {
      status = Number(headers[':status'] || 0);
    });
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      client.close();
      resolve({
        ok: status >= 200 && status < 300,
        error: status >= 200 && status < 300 ? null : `APNs ${status}: ${body.slice(0, 300)}`,
      });
    });
    request.on('error', (error) => {
      client.close();
      resolve({ ok: false, error: error.message });
    });
    request.end(
      JSON.stringify({
        aps: {
          alert: { title: notification.title, body: notification.body },
          sound: 'default',
        },
        deep_link: notification.deep_link || null,
        notification_id: notification.id,
      }),
    );
  });
}

async function googleAccessToken() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let account;
  try {
    account = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!account.client_email || !account.private_key || !account.project_id) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer
    .sign(normalizePrivateKey(account.private_key))
    .toString('base64url')}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`FCM OAuth failed: ${response.status}`);
  const json = await response.json();
  return { token: json.access_token, projectId: account.project_id };
}

async function sendFcm(token, notification) {
  try {
    const auth = await googleAccessToken();
    if (!auth) return { ok: false, error: 'FCM credentials not configured' };
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${auth.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: notification.title, body: notification.body },
            data: {
              deep_link: notification.deep_link || '',
              notification_id: notification.id,
            },
            android: { priority: 'high' },
          },
        }),
      },
    );
    const body = await response.text();
    return {
      ok: response.ok,
      error: response.ok ? null : `FCM ${response.status}: ${body.slice(0, 300)}`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'FCM failed' };
  }
}

export async function processPendingPushes(limit = 50) {
  return internalTransaction(async (client) => {
    const pending = await client.query(
      `SELECT n.*
       FROM notifications n
       WHERE n.delivered_at IS NULL
         AND n.next_push_attempt_at <= now()
         AND n.push_attempts < 8
       ORDER BY n.created_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit],
    );

    let delivered = 0;
    let failed = 0;

    for (const notification of pending.rows) {
      const tokens = await client.query(
        `SELECT id,platform,token
         FROM device_tokens
         WHERE user_id=$1 AND revoked_at IS NULL
         ORDER BY last_seen_at DESC`,
        [notification.user_id],
      );

      if (!tokens.rowCount) {
        await client.query(
          `UPDATE notifications
           SET push_attempts=push_attempts+1,
               last_push_error='No registered device tokens',
               next_push_attempt_at=now()+interval '6 hours'
           WHERE id=$1`,
          [notification.id],
        );
        failed += 1;
        continue;
      }

      let anySuccess = false;
      const errors = [];
      for (const device of tokens.rows) {
        const result =
          device.platform === 'ios'
            ? await sendApns(device.token, notification)
            : device.platform === 'android'
              ? await sendFcm(device.token, notification)
              : { ok: false, error: 'Web push not configured' };
        if (result.ok) {
          anySuccess = true;
        } else if (result.error) {
          errors.push(`${device.platform}: ${result.error}`);
        }
      }

      if (anySuccess) {
        await client.query(
          `UPDATE notifications
           SET delivered_at=now(),push_attempts=push_attempts+1,last_push_error=NULL
           WHERE id=$1`,
          [notification.id],
        );
        delivered += 1;
      } else {
        await client.query(
          `UPDATE notifications
           SET push_attempts=push_attempts+1,
               last_push_error=$2,
               next_push_attempt_at=now() + make_interval(mins => LEAST(360, 5 * (push_attempts + 1)))
           WHERE id=$1`,
          [notification.id, errors.join('; ').slice(0, 1000) || 'Push failed'],
        );
        failed += 1;
      }
    }

    return { checked: pending.rowCount, delivered, failed };
  });
}
