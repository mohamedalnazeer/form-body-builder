import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulate,
  defaultProfile,
  emptyDay,
  totalMacros,
  shiftDate,
  streak,
  validState,
  createDemo,
} from '../src/domain.js';
import { estimateLocally, validEstimate } from '../server/nutrition.mjs';
const p = { ...defaultProfile, startDate: '2026-01-01' };
const meal = { name: 'Daily total', calories: 2500, protein: 160, carbs: 280, fat: 80 };
const workout = { name: 'Push', muscles: ['Chest', 'Arms'], exercises: [], duration: 60 };
const day = { ...emptyDay(), meals: [meal], workouts: [workout], complete: true };
test('multiple sessions on one day cannot inflate muscle growth', () => {
  const one = simulate(p, { '2026-01-01': day });
  const many = simulate(p, { '2026-01-01': { ...day, workouts: Array(20).fill(workout) } });
  assert.deepEqual(one.muscle, many.muscle);
  assert.ok(one.muscleKg < 0.06);
  assert.equal(one.muscle.Legs, 0);
});
test('unfinished food logs never create fat loss', () => {
  const result = simulate(p, {
    '2026-01-01': { ...day, complete: false, meals: [{ ...meal, calories: 500 }] },
  });
  assert.equal(result.fatKg, 0);
  assert.equal(result.completedDays, 0);
});
test('calorie extremes are capped; no-log days do not drift', () => {
  const result = simulate(
    p,
    { '2026-01-01': { ...day, meals: [{ ...meal, calories: 100 }], complete: true } },
    '2026-12-31',
  );
  assert.equal(result.fatKg, -0.045);
  assert.equal(simulate(p, {}, '2026-12-31').weight, p.weight);
});
test('simulation ignores future entries and pre-baseline entries', () => {
  const actual = simulate(
    p,
    { '2025-12-31': day, '2026-01-01': day, '2026-02-01': day },
    '2026-01-15',
  );
  assert.equal(actual.trainedDays, 1);
});
test('consecutive-day recovery reduces repeated muscle stimulus', () => {
  const backToBack = simulate(p, { '2026-01-01': day, '2026-01-02': day });
  const spaced = simulate(p, { '2026-01-01': day, '2026-01-03': day });
  assert.ok(spaced.muscle.Chest > backToBack.muscle.Chest);
});
test('calendar math and streak cross year boundaries', () => {
  assert.equal(shiftDate('2026-01-01', -1), '2025-12-31');
  assert.equal(streak({ '2025-12-31': day, '2026-01-01': day }, '2026-01-02'), 2);
});
test('macros sum numerically', () =>
  assert.deepEqual(totalMacros([meal, meal]), {
    calories: 5000,
    protein: 320,
    carbs: 560,
    fat: 160,
  }));
test('local food estimator respects grams and quantities', () => {
  const result = estimateLocally('200g chicken, 150g rice, 2 eggs');
  assert.equal(result.calories, 330 + 195 + 143);
  assert.equal(result.items.length, 3);
  assert.equal(result.unknown.length, 0);
  assert.ok(validEstimate(result));
});
test('unknown foods are disclosed instead of fabricated', () => {
  const result = estimateLocally('1 banana and mystery supplement');
  assert.deepEqual(result.unknown, ['mystery supplement']);
  assert.match(result.assumptions, /Not recognized/);
  assert.equal(estimateLocally('an unknown brand').calories, 0);
});
test('backups reject corrupt macros and unknown muscle groups', () => {
  const demo = createDemo();
  assert.equal(validState(demo), true);
  assert.equal(validState({ version: 1 }), false);
  demo.logs['2026-01-01'] = { ...day, meals: [{ ...meal, protein: -10 }] };
  assert.equal(validState(demo), false);
  demo.logs['2026-01-01'] = { ...day, workouts: [{ ...workout, muscles: ['Invalid'] }] };
  assert.equal(validState(demo), false);
  demo.logs['2026-01-01'] = { ...day, workouts: [{ ...workout, exercises: [null] }] };
  assert.equal(validState(demo), false);
});
