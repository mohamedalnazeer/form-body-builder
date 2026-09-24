import { CHARACTER_DEFAULTS, validCharacter } from './character/config.js';
export const STORAGE_KEY = 'form-v1';
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const round = (n, places = 1) => Math.round(n * 10 ** places) / 10 ** places;
export const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const shiftDate = (key, days) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dateKey(d);
};
export const prettyDate = (key, opts = {}) =>
  new Date(`${key}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...opts,
  });
export const uid = () => globalThis.crypto.randomUUID();
export const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs'];
export const PRESETS = [
  {
    id: 'beginner',
    name: 'Fresh start',
    subtitle: 'Your first chapter',
    muscle: 0.28,
    bodyFat: 22,
    weight: 72,
  },
  {
    id: 'athletic',
    name: 'Athletic',
    subtitle: 'A solid foundation',
    muscle: 0.57,
    bodyFat: 16,
    weight: 78,
  },
  {
    id: 'built',
    name: 'Well built',
    subtitle: 'Time under the bar',
    muscle: 0.8,
    bodyFat: 14,
    weight: 88,
  },
  {
    id: 'pro',
    name: 'Advanced',
    subtitle: 'Years of consistency',
    muscle: 1,
    bodyFat: 11,
    weight: 95,
  },
];
export const WORKOUTS = {
  'Push day': {
    muscles: ['Chest', 'Shoulders', 'Arms'],
    exercises: [
      'Bench press',
      'Incline dumbbell press',
      'Overhead press',
      'Lateral raise',
      'Triceps pushdown',
    ],
    duration: 60,
  },
  'Back & biceps': {
    muscles: ['Back', 'Arms'],
    exercises: ['Lat pulldown', 'Seated cable row', 'Dumbbell row', 'Barbell curl'],
    duration: 55,
  },
  'Leg day': {
    muscles: ['Legs', 'Core'],
    exercises: ['Squat', 'Romanian deadlift', 'Leg press', 'Calf raise'],
    duration: 65,
  },
  'Full body': {
    muscles: [...MUSCLES],
    exercises: ['Squat', 'Bench press', 'Cable row', 'Overhead press'],
    duration: 60,
  },
  Cardio: { muscles: [], exercises: ['Running / cycling'], duration: 30 },
  Recovery: { muscles: [], exercises: [], duration: 20 },
};
export const defaultProfile = {
  ...CHARACTER_DEFAULTS,
  name: 'Alex',
  preset: 'athletic',
  muscle: 0.57,
  height: 178,
  weight: 78,
  bodyFat: 16,
  frame: 'classic',
  skin: '#d3a17c',
  shorts: '#353c39',
  goal: 'Build muscle',
  calorieTarget: 2600,
  proteinTarget: 160,
  carbTarget: 310,
  fatTarget: 80,
  maintenance: 2400,
  startDate: dateKey(),
};
export const totalMacros = (meals = []) =>
  meals.reduce(
    (a, m) => ({
      calories: a.calories + Number(m.calories || 0),
      protein: a.protein + Number(m.protein || 0),
      carbs: a.carbs + Number(m.carbs || 0),
      fat: a.fat + Number(m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
export const emptyDay = () => ({ meals: [], workouts: [], water: 0, complete: false });
export function createDemo() {
  const today = dateKey();
  const logs = {};
  for (let i = 27; i >= 1; i--) {
    const day = shiftDate(today, -i);
    const type = ['Push day', 'Back & biceps', 'Leg day', 'Recovery'][i % 4];
    logs[day] = {
      meals: [
        {
          id: uid(),
          name: 'Example daily nutrition',
          category: 'Daily total',
          calories: 2390 + (i % 5) * 60,
          protein: 145 + (i % 4) * 8,
          carbs: 285,
          fat: 75,
        },
      ],
      workouts:
        i % 4 === 3
          ? []
          : [
              {
                id: uid(),
                name: type,
                muscles: WORKOUTS[type].muscles,
                duration: WORKOUTS[type].duration,
                exercises: WORKOUTS[type].exercises.map((name) => ({
                  name,
                  sets: 3,
                  reps: 10,
                  weight: 30,
                })),
              },
            ],
      water: 6,
      complete: true,
    };
  }
  logs[today] = {
    meals: [
      {
        id: uid(),
        name: 'Oats, banana & peanut butter',
        category: 'Breakfast',
        calories: 485,
        protein: 22,
        carbs: 67,
        fat: 15,
        time: '8:30 AM',
      },
      {
        id: uid(),
        name: 'Grilled chicken & rice bowl',
        category: 'Lunch',
        calories: 680,
        protein: 52,
        carbs: 78,
        fat: 18,
        time: '12:45 PM',
      },
      {
        id: uid(),
        name: 'Greek yogurt & berries',
        category: 'Snack',
        calories: 210,
        protein: 20,
        carbs: 26,
        fat: 3,
        time: '3:00 PM',
      },
    ],
    workouts: [],
    water: 4,
    complete: false,
  };
  return {
    version: 1,
    demo: true,
    profile: { ...defaultProfile, startDate: shiftDate(today, -28) },
    logs,
    checkins: [
      { id: uid(), date: shiftDate(today, -28), weight: 78, bodyFat: 16 },
      { id: uid(), date: shiftDate(today, -14), weight: 78.3, bodyFat: 15.9 },
      { id: uid(), date: today, weight: 78.5, bodyFat: 15.8 },
    ],
  };
}
// A deliberately conservative game model, not a validated physiological prediction.
// Each calendar day contributes at most once; incomplete food days never imply a deficit.
export function simulate(profile, logs, until = dateKey()) {
  const muscle = Object.fromEntries(MUSCLES.map((m) => [m, 0]));
  let fatKg = 0,
    trainedDays = 0,
    completedDays = 0;
  const history = [];
  const dates = Object.keys(logs)
    .filter((d) => d >= profile.startDate && d <= until)
    .sort();
  let lastTrained = {};
  for (const date of dates) {
    const day = logs[date];
    const macros = totalMacros(day.meals);
    const trained = new Set(day.workouts.flatMap((w) => w.muscles));
    if (trained.size) trainedDays++;
    const proteinSupport = clamp(macros.protein / Math.max(1, profile.proteinTarget), 0.15, 1);
    const energySupport = clamp(macros.calories / Math.max(1, profile.maintenance), 0.25, 1.05);
    for (const m of trained) {
      if (!(m in muscle)) continue;
      const recovery = lastTrained[m] === shiftDate(date, -1) ? 0.5 : 1;
      muscle[m] +=
        0.00085 * proteinSupport * energySupport * recovery * (1.2 - profile.muscle * 0.5);
      muscle[m] = Math.min(muscle[m], 0.18);
      lastTrained[m] = date;
    }
    if (day.complete && macros.calories > 0) {
      completedDays++;
      fatKg += clamp(((macros.calories - profile.maintenance) / 7700) * 0.55, -0.045, 0.035);
    }
    history.push({
      date,
      muscle: round(Object.values(muscle).reduce((a, b) => a + b, 0) * 25, 2),
      fat: round(fatKg, 2),
    });
  }
  const muscleKg = Object.values(muscle).reduce((a, b) => a + b, 0) * 25;
  const weight = profile.weight + muscleKg + fatKg;
  const bodyFat = clamp((((profile.weight * profile.bodyFat) / 100 + fatKg) / weight) * 100, 5, 50);
  return { muscle, muscleKg, fatKg, weight, bodyFat, trainedDays, completedDays, history };
}
export function streak(logs, today = dateKey()) {
  let days = 0,
    d = today;
  const active = (key) => logs[key] && (logs[key].meals.length || logs[key].workouts.length);
  if (!active(d)) d = shiftDate(d, -1);
  while (active(d)) {
    days++;
    d = shiftDate(d, -1);
  }
  return days;
}
export function validState(data) {
  if (
    !data ||
    data.version !== 1 ||
    typeof data.demo !== 'boolean' ||
    !data.profile ||
    !data.logs ||
    !Array.isArray(data.checkins)
  )
    return false;
  const p = data.profile;
  if (!validCharacter(p)) return false;
  if (
    !['preset', 'frame', 'skin', 'shorts', 'goal'].every((k) => typeof p[k] === 'string') ||
    !PRESETS.some((preset) => preset.id === p.preset) ||
    !['classic', 'curved'].includes(p.frame)
  )
    return false;
  if (
    ![p.skin, p.shorts].every((c) => /^#[0-9a-fA-F]{6}$/.test(c)) ||
    typeof data.logs !== 'object' ||
    Array.isArray(data.logs)
  )
    return false;
  if (
    typeof p.name !== 'string' ||
    typeof p.startDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)
  )
    return false;
  const fields = [
    'height',
    'weight',
    'bodyFat',
    'muscle',
    'calorieTarget',
    'proteinTarget',
    'carbTarget',
    'fatTarget',
    'maintenance',
  ];
  if (
    fields.some((f) => !Number.isFinite(p[f]) || p[f] < 0) ||
    p.height < 100 ||
    p.height > 240 ||
    p.weight < 30 ||
    p.weight > 300 ||
    p.bodyFat > 60 ||
    p.muscle > 1.5
  )
    return false;
  if (
    ['calorieTarget', 'proteinTarget', 'carbTarget', 'fatTarget', 'maintenance'].some(
      (k) => p[k] <= 0,
    )
  )
    return false;
  if (Object.keys(data.logs).length > 10000) return false;
  return (
    Object.entries(data.logs).every(
      ([date, d]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        d &&
        Array.isArray(d.meals) &&
        Array.isArray(d.workouts) &&
        Number.isFinite(d.water) &&
        d.meals.every(
          (m) =>
            m &&
            typeof m.name === 'string' &&
            ['calories', 'protein', 'carbs', 'fat'].every(
              (k) => Number.isFinite(m[k]) && m[k] >= 0,
            ),
        ) &&
        d.workouts.every(
          (w) =>
            w &&
            typeof w.name === 'string' &&
            Array.isArray(w.muscles) &&
            w.muscles.every((m) => MUSCLES.includes(m)) &&
            Array.isArray(w.exercises) &&
            w.exercises.every(
              (e) =>
                e &&
                typeof e.name === 'string' &&
                ['sets', 'reps', 'weight'].every((k) => Number.isFinite(e[k]) && e[k] >= 0),
            ) &&
            Number.isFinite(w.duration),
        ),
    ) &&
    data.checkins.every(
      (c) =>
        c && typeof c.date === 'string' && Number.isFinite(c.weight) && Number.isFinite(c.bodyFat),
    )
  );
}
