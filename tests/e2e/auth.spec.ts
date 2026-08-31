import { expect, test } from '@playwright/test';

/**
 * Auth flow E2E.
 * Spec §79, §80.
 * - Roles/labels only — no `waitForTimeout`, no nth-child.
 * - Database cleanup happens via the E2E test fixture (handled in
 *   tests/e2e/_fixtures.ts in a follow-up).
 */

test('user can sign up and reach the home tab', async ({ page }) => {
  await page.goto('/');
  // The app should render the auth screen.
  await expect(page.getByRole('heading', { name: 'COSTCO-SAVER' })).toBeVisible();

  // Generate a unique email so the test can re-run safely.
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@costco-saver.test`;
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Costco-saver-test-123!');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Home renders the warehouse picker prompt.
  await expect(page.getByText('Active warehouse')).toBeVisible({ timeout: 15_000 });
});
