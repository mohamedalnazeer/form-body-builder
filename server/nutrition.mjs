// Approximate generic-food reference values; recipes and brands vary.
const foods = [
  ['chicken', 165, 31, 0, 3.6, 150],
  ['rice', 130, 2.7, 28, 0.3, 150],
  ['egg', 143, 12.6, 0.7, 9.5, 50],
  ['banana', 89, 1.1, 23, 0.3, 118],
  ['oats?', 389, 16.9, 66, 6.9, 50],
  ['peanut butter', 588, 25, 20, 50, 16],
  ['greek yogurt', 73, 10, 3.9, 1.9, 170],
  ['yogurt', 63, 5.3, 7, 1.6, 170],
  ['salmon', 208, 20, 0, 13, 150],
  ['beef', 250, 26, 0, 15, 150],
  ['tofu', 144, 17, 3, 9, 150],
  ['broccoli', 35, 2.4, 7, 0.4, 100],
  ['avocado', 160, 2, 8.5, 15, 100],
  ['bread|toast', 265, 9, 49, 3.2, 35],
  ['milk', 50, 3.4, 5, 2, 240],
  ['whey|protein powder', 400, 80, 8, 5, 30],
  ['potato', 87, 1.9, 20, 0.1, 180],
  ['pasta', 158, 5.8, 31, 0.9, 150],
  ['apple', 52, 0.3, 14, 0.2, 182],
  ['berries|blueberries|strawberries', 50, 0.7, 12, 0.3, 100],
  ['olive oil', 884, 0, 0, 100, 14],
  ['tuna', 116, 26, 0, 1, 120],
  ['almonds?', 579, 21, 22, 50, 28],
  ['lentils?', 116, 9, 20, 0.4, 150],
];
export function estimateLocally(text) {
  const parts = text
    .toLowerCase()
    .split(/[,;+\n]|\band\b|\bwith\b/)
    .map((x) => x.trim())
    .filter(Boolean);
  const items = [],
    unknown = [];
  for (const part of parts) {
    let found = false;
    for (const [pattern, cal, protein, carbs, fat, serving] of foods) {
      const match = new RegExp(`\\b(?:${pattern})s?\\b`).exec(part);
      if (!match || (pattern === 'yogurt' && part.includes('greek'))) continue;
      const before = part.slice(0, match.index);
      const after = part.slice(match.index + match[0].length);
      const amount =
        before.match(
          /(\d+(?:\.\d+)?)\s*(kg|grams?|g|oz|ml|cups?|scoops?|tbsp|slices?)?\s*(?:of\s+)?(?:cooked\s+|grilled\s+|raw\s+)?$/,
        ) || after.match(/^\s*(\d+(?:\.\d+)?)\s*(kg|grams?|g|oz|ml|cups?|scoops?|tbsp|slices?)\b/);
      let grams = serving;
      if (amount) {
        const n = Number(amount[1]),
          unit = amount[2];
        grams =
          unit === 'kg'
            ? n * 1000
            : unit === 'oz'
              ? n * 28.35
              : /^(g|gram|grams|ml)$/.test(unit)
                ? n
                : unit?.startsWith('cup')
                  ? n * (pattern === 'rice' ? 158 : pattern === 'oats?' ? 80 : 240)
                  : n * serving;
      }
      grams = Math.min(grams, 5000);
      items.push({
        name: `${match[0]} (${Math.round(grams)} g)`,
        calories: Math.round((cal * grams) / 100),
        protein: Math.round((protein * grams) / 100),
        carbs: Math.round((carbs * grams) / 100),
        fat: Math.round((fat * grams) / 100),
      });
      found = true;
    }
    if (!found) unknown.push(part);
  }
  const totals = items.reduce(
    (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + b[k]])),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    ...totals,
    name: text.slice(0, 80),
    items,
    source: 'built-in',
    assumptions: `Generic foods; rice, meat, pasta and potatoes use cooked weights. Unspecified amounts use a typical serving.${unknown.length ? ` Not recognized: ${unknown.join(', ')}. Add these manually.` : ''}`,
    unknown,
  };
}
export function validEstimate(x) {
  return (
    x &&
    typeof x.name === 'string' &&
    typeof x.assumptions === 'string' &&
    ['calories', 'protein', 'carbs', 'fat'].every(
      (k) => Number.isFinite(x[k]) && x[k] >= 0 && x[k] <= 20000,
    )
  );
}
