import { test, expect } from '@playwright/test';
test('Unity renderer loads, receives customization, and leaves web inputs usable', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log(msg.text());
    if (msg.type() === 'error' && /Exception|abort|shader.*error/i.test(msg.text()))
      errors.push(msg.text());
  });
  await page.goto('/');
  await expect(page.locator('[data-renderer="unity"]')).toBeVisible({ timeout: 90000 });
  await expect(page.locator('.unity-overlay.ready')).toBeVisible();
  await page.getByRole('button', { name: 'Customize character', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Details', exact: true }).click();
  await dialog.getByLabel('Your name', { exact: true }).fill('');
  await dialog
    .getByLabel('Your name', { exact: true })
    .pressSequentially('Unity verified', { delay: 20 });
  await expect(dialog.getByLabel('Your name', { exact: true })).toHaveValue('Unity verified');
  await dialog.getByRole('button', { name: 'Outfit', exact: true }).click();
  await dialog.getByRole('button', { name: /Tech suit/ }).click();
  await dialog.getByRole('button', { name: 'Save character', exact: true }).click();
  await expect(page.locator('[data-renderer="unity"]')).toBeVisible();
  await expect(page.getByText('LET’S BUILD, UNITY VERIFIED')).toBeVisible();
  await page.screenshot({ path: 'test-results/form-unity.png', fullPage: true });
  await page.getByRole('button', { name: 'back', exact: true }).click();
  await page.getByRole('button', { name: 'Reset character view', exact: true }).click();
  await expect(page.locator('.view-controls button.selected')).toHaveText('front');
  expect(errors).toEqual([]);
});
