import { describe, expect, it } from 'vitest';

const API = process.env.TEST_API_URL ?? '';
const ENABLED = Boolean(API);

interface Session {
  accessToken: string;
  user: { id: string; email: string };
}

async function signup(label: string): Promise<Session> {
  const email = `security-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const response = await fetch(`${API}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Security-test-123!' }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as Session;
}

async function api<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: T }> {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${session.accessToken}`);
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(`${API}${path}`, { ...init, headers });
  let body = {} as T;
  try {
    body = (await response.json()) as T;
  } catch {
    // no-op
  }
  return { status: response.status, body };
}

const describeApi = ENABLED ? describe : describe.skip;

describeApi('DigitalOcean API multi-user isolation', () => {
  it('prevents User B from deleting or listing User A purchase', async () => {
    const [a, b] = await Promise.all([signup('a-purchase'), signup('b-purchase')]);

    const created = await api<{ purchase: { id: string } }>(a, '/api/v1/purchases', {
      method: 'POST',
      body: JSON.stringify({
        productId: '20000000-0000-4000-8000-000000000001',
        warehouseId: '10000000-0000-4000-8000-000000000001',
        unitPriceCents: 2999,
        quantity: 1,
        purchaseDate: new Date().toISOString(),
        source: 'manual',
      }),
    });
    expect(created.status).toBe(201);
    const purchaseId = created.body.purchase.id;

    const bList = await api<{ purchases: Array<{ id: string }> }>(b, '/api/v1/purchases');
    expect(bList.status).toBe(200);
    expect(bList.body.purchases.some((row) => row.id === purchaseId)).toBe(false);

    const bDelete = await api<{ error?: unknown }>(b, `/api/v1/purchases/${purchaseId}`, {
      method: 'DELETE',
    });
    expect(bDelete.status).toBe(404);

    const aList = await api<{ purchases: Array<{ id: string }> }>(a, '/api/v1/purchases');
    expect(aList.body.purchases.some((row) => row.id === purchaseId)).toBe(true);
  });

  it('prevents User B from deleting User A watch', async () => {
    const [a, b] = await Promise.all([signup('a-watch'), signup('b-watch')]);
    const created = await api<{ watch: { id: string } }>(a, '/api/v1/watches', {
      method: 'POST',
      body: JSON.stringify({
        productId: '20000000-0000-4000-8000-000000000001',
        warehouseId: '10000000-0000-4000-8000-000000000001',
        notifyAnyDrop: true,
      }),
    });
    expect(created.status).toBe(201);
    const watchId = created.body.watch.id;

    const bDelete = await api(b, `/api/v1/watches/${watchId}`, { method: 'DELETE' });
    expect(bDelete.status).toBe(404);

    const aList = await api<{ watches: Array<{ id: string }> }>(a, '/api/v1/watches');
    expect(aList.body.watches.some((row) => row.id === watchId)).toBe(true);
  });

  it('isolates receipts and exports', async () => {
    const [a, b] = await Promise.all([signup('a-receipt'), signup('b-receipt')]);
    const created = await api<{ receipt: { id: string } }>(a, '/api/v1/receipts', {
      method: 'POST',
      body: JSON.stringify({
        warehouseId: '10000000-0000-4000-8000-000000000001',
        purchaseDate: new Date().toISOString(),
        totalCents: 4599,
      }),
    });
    expect(created.status).toBe(201);
    const receiptId = created.body.receipt.id;

    const bReceipts = await api<{ receipts: Array<{ id: string }> }>(b, '/api/v1/receipts');
    expect(bReceipts.body.receipts.some((row) => row.id === receiptId)).toBe(false);

    const bExport = await api<{ receipts: Array<{ id: string }> }>(b, '/api/v1/me/export');
    expect(bExport.status).toBe(200);
    expect(bExport.body.receipts.some((row) => row.id === receiptId)).toBe(false);

    const aExport = await api<{ receipts: Array<{ id: string }> }>(a, '/api/v1/me/export');
    expect(aExport.body.receipts.some((row) => row.id === receiptId)).toBe(true);
  });

  it('requires authentication for all private resources', async () => {
    for (const path of [
      '/api/v1/purchases',
      '/api/v1/watches',
      '/api/v1/adjustments',
      '/api/v1/notifications',
      '/api/v1/receipts',
      '/api/v1/saved-deals',
      '/api/v1/me/export',
    ]) {
      const response = await fetch(`${API}${path}`);
      expect(response.status, path).toBe(401);
    }
  });
});
