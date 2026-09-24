// Canonical storage stays in kg/cm/liters. Display preferences never rewrite measurements.
export const LB_PER_KG = 2.2046226218487757;
export const CM_PER_IN = 2.54;
export const OZ_PER_L = 33.8140227018;
export const weightUnit = (units) => (units === 'imperial' ? 'lb' : 'kg');
export const heightUnit = (units) => (units === 'imperial' ? 'in' : 'cm');
export const weightValue = (kg, units) => (units === 'imperial' ? kg * LB_PER_KG : kg);
export const weightKg = (value, units) => (units === 'imperial' ? value / LB_PER_KG : value);
export const heightValue = (cm, units) => (units === 'imperial' ? cm / CM_PER_IN : cm);
export const heightCm = (value, units) => (units === 'imperial' ? value * CM_PER_IN : value);
export const displayNumber = (value, digits = 1) => Number(Number(value).toFixed(digits));
export const formatWeight = (kg, units, digits = 1) =>
  `${displayNumber(weightValue(kg, units), digits)} ${weightUnit(units)}`;
export const formatHeight = (cm, units) => {
  if (units !== 'imperial') return `${displayNumber(cm)} cm`;
  const inches = Math.round(cm / CM_PER_IN);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
};
