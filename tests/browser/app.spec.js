import { test, expect } from '@playwright/test';

test('dashboard, 3D canvas and desktop navigation render cleanly', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?renderer=web');
  await expect(page.getByRole('heading', { name: 'Your effort. Taking shape.' })).toBeVisible();
  await expect(page.locator('canvas:not(.unity-overlay)')).toBeVisible();
  await page.screenshot({ path: 'test-results/form-desktop.png', fullPage: true });
  for (const name of ['My physique', 'Nutrition', 'Training', 'Progress', 'Overview']) {
    await page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
    await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('estimate, save, edit, complete and delete meal with persistence', async ({ page }) => {
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: /Log a meal/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Estimate a meal', exact: true }).click();
  await dialog.getByLabel('What did you eat?').fill('200g chicken, 150g rice');
  await dialog.getByRole('button', { name: 'Estimate macros', exact: true }).click();
  await expect(dialog.getByText(/estimate ready/)).toBeVisible();
  await expect(dialog.getByLabel('Calories', { exact: false })).toHaveValue('525');
  await dialog.getByLabel('Meal name').fill('Test recovery bowl');
  await dialog.getByRole('button', { name: 'Save meal' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('.meal-title').filter({ hasText: 'Test recovery bowl' })).toBeVisible();
  await page.reload();
  await page.locator('.meal-title').filter({ hasText: 'Test recovery bowl' }).click();
  await page.getByRole('dialog').getByLabel('Calories', { exact: false }).fill('550');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('button', { name: /Finished eating/ }).click();
  await expect(page.getByRole('button', { name: /Food log complete/ })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Test recovery bowl', exact: true }).click();
  await expect(page.getByRole('button', { name: /Test recovery bowl/ })).toHaveCount(0);
});

test('workout and check-in update the right day', async ({ page }) => {
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: 'Log a workout', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Back & biceps', exact: true }).click();
  await dialog.getByLabel('Exercise 1 weight', { exact: true }).fill('45');
  await dialog.getByRole('button', { name: 'Save workout' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Back & biceps', exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Progress', exact: true }).click();
  await page.getByRole('button', { name: 'Add check-in' }).click();
  await page.getByRole('dialog').getByLabel('Body weight', { exact: false }).fill('180.2');
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await expect(page.locator('.checkin-table').getByText('180.2 lb', { exact: true })).toBeVisible();
});

test('fresh character starts with zero logs and persists custom settings', async ({ page }) => {
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: 'Create my character' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Fresh start/ }).click();
  await dialog.getByLabel('Your name', { exact: true }).fill('Sam');
  await dialog.getByRole('checkbox', { name: /Start fresh/ }).check();
  await dialog.getByRole('button', { name: 'Let’s build', exact: true }).click();
  await expect(page.getByText('LET’S BUILD, SAM')).toBeVisible();
  await expect(page.getByText('Fuel your next chapter.', { exact: true })).toBeVisible();
  await expect(page.locator('.demo-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add glass of water' }).click();
  await page.reload();
  await expect(page.locator('.water-card h2')).toContainText('8.5');
  await expect(page.getByText('LET’S BUILD, SAM')).toBeVisible();
});

test('phone layout fits and navigation and forms work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?renderer=web');
  await expect(page.locator('canvas:not(.unity-overlay)')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/form-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Training', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Put in the work.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Leg day Legs/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Save workout' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Leg day', exact: true })).toBeVisible();
});
