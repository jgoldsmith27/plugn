import { test, expect } from '@playwright/test';

test('user can load template and run flow', async ({ page }) => {
  await page.goto('/flows');
  await page.getByRole('button', { name: 'Start from Template' }).click();
  await page.waitForURL(/\/flows\/.+\/editor/);
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByText('success', { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Mock completion', { exact: false })).toBeVisible({ timeout: 20_000 });
});
