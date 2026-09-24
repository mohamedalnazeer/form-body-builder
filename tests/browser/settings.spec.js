import { test, expect } from '@playwright/test';

test('targets and backup export/restore work, invalid files preserve current data', async ({
  page,
}) => {
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Calories', { exact: false }).fill('2800');
  await dialog.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('.stat-bottom').getByText('of 2,800 daily target')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  dialog = page.getByRole('dialog');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^form-backup-/);
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(dialog.getByRole('alert')).toContainText('valid FORM backup');
  const backup = await page.evaluate(() => JSON.parse(localStorage.getItem('form-v1')));
  backup.profile.name = 'Restored';
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await dialog.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByText('LET’S BUILD, RESTORED')).toBeVisible();
  await page.reload();
  await expect(page.getByText('LET’S BUILD, RESTORED')).toBeVisible();
});

test('profile validates hidden metric tabs and view reset remains usable', async ({ page }) => {
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: 'Customize character', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Details', exact: true }).click();
  await dialog.getByLabel('Height', { exact: false }).fill('');
  await dialog.getByRole('button', { name: 'Style', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save character' }).click();
  await expect(dialog.getByRole('alert')).toContainText('height, weight and body fat');
  await dialog.getByRole('button', { name: /Metric kg/ }).click();
  await dialog.getByLabel('Height', { exact: false }).fill('182');
  await dialog.getByRole('button', { name: 'Save character' }).click();
  await page.getByRole('button', { name: 'back', exact: true }).click();
  await page.getByRole('button', { name: 'Reset character view', exact: true }).click();
  await expect(
    page.locator('.view-controls').getByRole('button', { name: 'front', exact: true }),
  ).toHaveClass('selected');
});

test('food API validates input and blocks unexpected origins', async ({ request }) => {
  const estimate = await request.post('/api/estimate', {
    data: { text: '2 eggs and 1 banana', useAI: false },
  });
  expect(estimate.ok()).toBeTruthy();
  expect((await estimate.json()).calories).toBe(248);
  expect((await request.post('/api/estimate', { data: { text: '' } })).status()).toBe(400);
  expect(
    (
      await request.post('/api/estimate', {
        headers: { origin: 'https://unrelated.example' },
        data: { text: '1 egg' },
      })
    ).status(),
  ).toBe(403);
});
