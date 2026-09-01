import { expect, test } from '@playwright/test';

test('user can create an account and reach the real home dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'COSTCO-SAVER' })).toBeVisible();

  await page.getByRole('button', { name: 'Need an account? Create one' }).click();
  const email = `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Costco-saver-test-123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText('Active warehouse')).toBeVisible();
  await expect(page.getByText('Test Warehouse East')).toBeVisible();
});

test('invalid credentials show a real authentication error', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('missing-user@example.test');
  await page.getByLabel('Password').fill('Wrong-password-123!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
});
