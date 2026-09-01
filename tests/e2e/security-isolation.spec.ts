import { expect, test } from '@playwright/test';

async function createAccount(page: import('@playwright/test').Page, label: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Need an account? Create one' }).click();
  await page.getByLabel('Email').fill(
    `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`,
  );
  await page.getByLabel('Password').fill('Costco-saver-test-123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Active warehouse')).toBeVisible();
}

test('two browser contexts cannot cross-delete private purchases', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await createAccount(pageA, 'user-a');
    await createAccount(pageB, 'user-b');

    const purchaseId = await pageA.evaluate(async () => {
      const token = localStorage.getItem('costco-saver.access-token');
      const response = await fetch('/api/v1/purchases', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: '20000000-0000-4000-8000-000000000001',
          warehouseId: '10000000-0000-4000-8000-000000000001',
          unitPriceCents: 2999,
          quantity: 1,
          purchaseDate: new Date().toISOString(),
          source: 'manual',
        }),
      });
      if (!response.ok) throw new Error(`create purchase failed: ${response.status}`);
      const body = await response.json();
      return body.purchase.id as string;
    });

    const bDeleteStatus = await pageB.evaluate(async (id) => {
      const token = localStorage.getItem('costco-saver.access-token');
      const response = await fetch(`/api/v1/purchases/${id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
      return response.status;
    }, purchaseId);
    expect(bDeleteStatus).toBe(404);

    const aStillOwnsPurchase = await pageA.evaluate(async (id) => {
      const token = localStorage.getItem('costco-saver.access-token');
      const response = await fetch('/api/v1/purchases', {
        headers: { authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      return body.purchases.some((row: { id: string }) => row.id === id);
    }, purchaseId);
    expect(aStillOwnsPurchase).toBe(true);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});
