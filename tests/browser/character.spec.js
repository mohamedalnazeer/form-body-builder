import { test, expect } from '@playwright/test';
test('customization persists and US/metric switches preserve original measurements', async ({
  page,
}) => {
  await page.goto('/?renderer=web');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('form-v1')).profile);
  await page.getByRole('button', { name: 'Switch to metric units' }).click();
  await expect(page.getByRole('button', { name: 'Switch to US units' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to US units' }).click();
  await page.getByRole('button', { name: 'Customize character', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(dialog.getByLabel('Body weight', { exact: false })).toHaveValue('172');
  await dialog.getByRole('button', { name: /Metric kg/ }).click();
  await expect(dialog.getByLabel('Body weight', { exact: false })).toHaveValue('78');
  await dialog.getByRole('button', { name: 'Style', exact: true }).click();
  await dialog.getByRole('button', { name: /High tail/ }).click();
  await dialog.getByRole('button', { name: 'Outfit', exact: true }).click();
  await dialog.getByRole('button', { name: /Fighter gi/ }).click();
  await page.screenshot({ path: 'test-results/character-customizer.png' });
  await dialog.getByRole('button', { name: 'Save character', exact: true }).click();
  await page.reload();
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('form-v1')).profile);
  expect(after.weight).toBe(before.weight);
  expect(after.height).toBe(before.height);
  expect(after.hairStyle).toBe('ponytail');
  expect(after.outfit).toBe('gi');
  expect(after.units).toBe('metric');
});
test('imperial measurements and workout weights are stored in canonical units', async ({
  page,
}) => {
  await page.goto('/?renderer=web');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Customize character', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Details', exact: true }).click();
  await dialog.getByLabel('Height', { exact: false }).fill('72');
  await dialog.getByLabel('Body weight', { exact: false }).fill('180');
  await dialog.getByRole('button', { name: 'Save character', exact: true }).click();
  await page.getByRole('button', { name: 'Log a workout', exact: true }).click();
  await page.getByLabel('Exercise 1 weight', { exact: true }).fill('135');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('form-v1')));
  expect(data.profile.height).toBeCloseTo(182.88, 5);
  expect(data.profile.weight).toBeCloseTo(81.6466, 3);
  const exercise = Object.values(data.logs)
    .flatMap((d) => d.workouts)
    .flatMap((w) => w.exercises)
    .find((e) => Math.abs(e.weight - 61.23497) < 0.001);
  expect(exercise).toBeTruthy();
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0);
});
test('meal celebration is dismissible and cannot duplicate a saved log', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?renderer=web');
  await page.getByRole('button', { name: /Log a meal/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Meal name').fill('Animation test');
  await dialog.getByLabel('Calories', { exact: false }).fill('300');
  await dialog.getByLabel('Protein', { exact: false }).fill('25');
  await dialog.getByLabel('Carbs', { exact: false }).fill('30');
  await dialog.getByLabel('Fat', { exact: false }).fill('9');
  await dialog.getByRole('button', { name: 'Save meal' }).click();
  await expect(page.getByRole('dialog', { name: 'Meal celebration' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0);
  await page.reload();
  const matches = await page.evaluate(
    () =>
      Object.values(JSON.parse(localStorage.getItem('form-v1')).logs)
        .flatMap((d) => d.meals)
        .filter((m) => m.name === 'Animation test').length,
  );
  expect(matches).toBe(1);
});
