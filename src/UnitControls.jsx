import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  displayNumber,
  weightValue,
  weightKg,
  heightValue,
  heightCm,
  weightUnit,
  heightUnit,
} from './units.js';
export const UnitContext = createContext('imperial');
export const useUnits = () => useContext(UnitContext);
export function UnitSwitch({ value, onChange }) {
  return (
    <div className="unit-switch" role="group" aria-label="Measurement units">
      <button
        type="button"
        aria-pressed={value === 'imperial'}
        className={value === 'imperial' ? 'selected' : ''}
        onClick={() => onChange('imperial')}
      >
        US <span>lb / in</span>
      </button>
      <button
        type="button"
        aria-pressed={value === 'metric'}
        className={value === 'metric' ? 'selected' : ''}
        onClick={() => onChange('metric')}
      >
        Metric <span>kg / cm</span>
      </button>
    </div>
  );
}
export function MeasurementInput({
  kind = 'weight',
  value,
  onChange,
  units,
  min = 0,
  max = 1000,
  required = true,
  ...props
}) {
  const toDisplay = kind === 'height' ? heightValue : weightValue;
  const toCanonical = kind === 'height' ? heightCm : weightKg;
  const [text, setText] = useState(
    value === '' ? '' : String(displayNumber(toDisplay(value, units))),
  );
  useEffect(() => {
    setText(value === '' ? '' : String(displayNumber(toDisplay(value, units))));
  }, [value, units, kind]);
  return (
    <input
      {...props}
      type="number"
      step="any"
      min={displayNumber(toDisplay(min, units), 3)}
      max={displayNumber(toDisplay(max, units), 3)}
      required={required}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value === '' ? '' : toCanonical(Number(e.target.value), units));
      }}
    />
  );
}
