import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Dumbbell,
  Leaf,
  LoaderCircle,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import Avatar from './Avatar.jsx';
import { useUnits, UnitSwitch, MeasurementInput } from './UnitControls.jsx';
import { weightUnit, heightUnit, weightKg, formatWeight } from './units.js';
import { HAIRSTYLES, OUTFITS, normalizeProfile } from './character/config.js';
import { Button, IconButton } from './App.jsx';
import {
  PRESETS,
  WORKOUTS,
  MUSCLES,
  clamp,
  dateKey,
  defaultProfile,
  round,
  validState,
} from './domain.js';

function Modal({ title, subtitle, children, onClose, wide = false }) {
  const ref = useRef(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    const handler = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled), input:not(:disabled), textarea, select, a[href]',
          ),
        ].filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        className={`modal ${wide ? 'wide-modal' : ''}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">YOUR EVERYDAY, MADE VISIBLE</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
function Field({ label, suffix, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <div className="input-wrap">
        {children}
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </label>
  );
}
function NumberField({
  label,
  value,
  onChange,
  suffix,
  min = 0,
  max = 10000,
  step = 1,
  required = true,
}) {
  return (
    <Field label={label} suffix={suffix}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    </Field>
  );
}

export function MealModal({ initial, estimate, status, onClose, onSave }) {
  const [mode, setMode] = useState(estimate ? 'estimate' : 'manual');
  const [form, setForm] = useState(
    initial || { name: '', category: 'Breakfast', calories: '', protein: '', carbs: '', fat: '' },
  );
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [result, setResult] = useState(null),
    [useAI, setUseAI] = useState(false);
  const abort = useRef();
  useEffect(() => () => abort.current?.abort(), []);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const getEstimate = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    abort.current = new AbortController();
    try {
      const r = await fetch('/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, useAI }),
        signal: abort.current.signal,
      });
      const value = await r.json();
      if (!r.ok) throw new Error(value.error || 'Estimate unavailable.');
      if (value.calories === 0 && !value.protein && !value.carbs && !value.fat)
        throw new Error(
          'No foods recognized. Try “2 eggs and 1 banana”, use AI if connected, or enter the label manually.',
        );
      setResult(value);
      setForm((f) => ({
        ...f,
        name: value.name,
        calories: Math.round(value.calories),
        protein: round(value.protein),
        carbs: round(value.carbs),
        fat: round(value.fat),
      }));
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Add a meal name.');
    if (!Number(form.calories) && !Number(form.protein) && !Number(form.carbs) && !Number(form.fat))
      return setError('Enter at least one nutrition value.');
    onSave({
      ...form,
      name: form.name.trim(),
      calories: Number(form.calories),
      protein: Number(form.protein),
      carbs: Number(form.carbs),
      fat: Number(form.fat),
      source: result?.source || initial?.source || 'manual',
      time:
        initial?.time ||
        new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    });
  };
  return (
    <Modal
      title={initial ? 'Edit your meal' : 'A little fuel for your form.'}
      subtitle="Log a meal. Keep the momentum."
      onClose={onClose}
    >
      <div className="segmented">
        <button className={mode === 'manual' ? 'selected' : ''} onClick={() => setMode('manual')}>
          <SlidersHorizontal size={15} /> Enter macros
        </button>
        <button
          className={mode === 'estimate' ? 'selected' : ''}
          onClick={() => setMode('estimate')}
        >
          <Sparkles size={15} /> Estimate a meal
        </button>
      </div>
      {mode === 'estimate' && (
        <div className="estimate-section">
          <Field label="What did you eat?">
            <textarea
              autoFocus
              rows={3}
              placeholder="e.g. 200g chicken, 150g rice and 100g broccoli"
              value={text}
              maxLength={1500}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <div className="estimator-options">
            <label className="check-label">
              <input
                type="checkbox"
                checked={useAI}
                disabled={!status.ai || busy}
                onChange={(e) => setUseAI(e.target.checked)}
              />{' '}
              Use AI {status.ai ? '' : '(not connected)'}
            </label>
            <span className="tiny-label">{useAI ? 'OPENAI' : 'BUILT-IN FOOD REFERENCE'}</span>
          </div>
          <p className="small muted">
            {useAI
              ? 'Your meal description will be sent to OpenAI when you estimate. Review quantities and macros before saving.'
              : 'Works with common foods. Include amounts, separate ingredients with commas, and use cooked weights for rice and meat.'}
          </p>
          <Button secondary onClick={getEstimate} disabled={busy || !text.trim()}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{' '}
            {busy ? 'Estimating…' : 'Estimate macros'}
            <ArrowRight size={15} />
          </Button>
          {result && (
            <div className="estimate-result">
              <span>
                <Check size={14} /> {result.source === 'AI' ? 'AI' : 'Built-in'} estimate ready —
                review below
              </span>
              <p>{result.assumptions}</p>
              {result.items?.length > 0 && (
                <div>
                  {result.items.map((item, i) => (
                    <span className="food-chip" key={i}>
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Meal name" className="span-2">
            <input
              placeholder="e.g. Chicken & rice bowl"
              value={form.name}
              maxLength={100}
              required
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>
          <Field label="Meal">
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Daily total'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <NumberField
            label="Calories"
            suffix="kcal"
            value={form.calories}
            onChange={(v) => update('calories', v)}
            max={15000}
          />
          <NumberField
            label="Protein"
            suffix="g"
            value={form.protein}
            onChange={(v) => update('protein', v)}
            step={0.1}
            max={1500}
          />
          <NumberField
            label="Carbs"
            suffix="g"
            value={form.carbs}
            onChange={(v) => update('carbs', v)}
            step={0.1}
            max={2000}
          />
          <NumberField
            label="Fats"
            suffix="g"
            value={form.fat}
            onChange={(v) => update('fat', v)}
            step={0.1}
            max={1000}
          />
        </div>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="modal-footer">
          <span className="small muted">Estimates vary by brand and preparation.</span>
          <Button type="submit">
            {initial ? 'Save changes' : 'Save meal'}
            <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function WorkoutModal({ preset = 'Push day', onClose, onSave }) {
  const units = useUnits();
  const initial = WORKOUTS[preset];
  const [name, setName] = useState(preset),
    [duration, setDuration] = useState(initial.duration),
    [muscles, setMuscles] = useState(initial.muscles);
  const makeExercises = (w) => w.exercises.map((name) => ({ name, sets: 3, reps: 10, weight: 0 }));
  const [exercises, setExercises] = useState(makeExercises(initial));
  const [notes, setNotes] = useState('');
  const select = (value) => {
    setName(value);
    setDuration(WORKOUTS[value].duration);
    setMuscles(WORKOUTS[value].muscles);
    setExercises(makeExercises(WORKOUTS[value]));
  };
  const changeExercise = (i, k, v) =>
    setExercises((ex) => ex.map((e, j) => (i === j ? { ...e, [k]: v } : e)));
  return (
    <Modal
      title="Put your effort on the record."
      subtitle="The session is yours. Make it count."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            name,
            duration: Number(duration),
            muscles,
            exercises: exercises.map((e) => ({
              ...e,
              sets: Number(e.sets),
              reps: Number(e.reps),
              weight: weightKg(Number(e.weight), units),
            })),
            notes,
          });
        }}
      >
        <div className="workout-type-grid">
          {Object.keys(WORKOUTS).map((w) => (
            <button
              type="button"
              className={name === w ? 'selected' : ''}
              onClick={() => select(w)}
              key={w}
            >
              {w === 'Recovery' ? (
                <Leaf size={17} />
              ) : w === 'Cardio' ? (
                <Activity size={17} />
              ) : (
                <Dumbbell size={17} />
              )}{' '}
              {w}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <NumberField
            label="Session duration"
            suffix="min"
            min={1}
            max={600}
            value={duration}
            onChange={setDuration}
          />
          <div className="session-summary">
            <Clock3 size={19} />
            <span>
              {exercises.length} exercises
              <br />
              <small>{muscles.length} muscle groups</small>
            </span>
          </div>
        </div>
        <label className="field-label">Muscles trained</label>
        <div className="muscle-picker">
          {MUSCLES.map((m) => (
            <button
              type="button"
              key={m}
              className={muscles.includes(m) ? 'selected' : ''}
              onClick={() =>
                setMuscles((ms) => (ms.includes(m) ? ms.filter((x) => x !== m) : [...ms, m]))
              }
            >
              {muscles.includes(m) && <Check size={12} />} {m}
            </button>
          ))}
        </div>
        {name !== 'Cardio' && name !== 'Recovery' && (
          <>
            <div className="exercise-labels">
              <span>Exercise</span>
              <span>Sets</span>
              <span>Reps</span>
              <span>{weightUnit(units)}</span>
              <span />
            </div>
            {exercises.map((e, i) => (
              <div className="exercise-edit-row" key={i}>
                <input
                  aria-label={`Exercise ${i + 1} name`}
                  value={e.name}
                  required
                  maxLength={80}
                  onChange={(ev) => changeExercise(i, 'name', ev.target.value)}
                />
                {['sets', 'reps', 'weight'].map((k) => (
                  <input
                    key={k}
                    aria-label={`Exercise ${i + 1} ${k}`}
                    type="number"
                    min={k === 'weight' ? 0 : 1}
                    max={k === 'weight' ? 1000 : k === 'sets' ? 30 : 200}
                    step={k === 'weight' ? 0.5 : 1}
                    required
                    value={e[k]}
                    onChange={(ev) => changeExercise(i, k, ev.target.value)}
                  />
                ))}
                <IconButton
                  type="button"
                  label={`Remove exercise ${i + 1}`}
                  onClick={() => setExercises((ex) => ex.filter((_, j) => i !== j))}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            ))}
            <button
              type="button"
              className="text-button add-exercise"
              disabled={exercises.length >= 20}
              onClick={() =>
                setExercises((ex) => [...ex, { name: '', sets: 3, reps: 10, weight: 0 }])
              }
            >
              <Plus size={15} /> Add exercise
            </button>
          </>
        )}
        <Field label="Session notes (optional)">
          <textarea
            rows={2}
            placeholder={
              name === 'Cardio'
                ? 'e.g. 5 km easy run, 30 minutes'
                : 'How did it feel? Any wins today?'
            }
            value={notes}
            maxLength={500}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div className="modal-footer">
          <span className="small muted">Consistency builds your character over time.</span>
          <Button type="submit">
            Save workout <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ProfileModal({ profile, fresh, onClose, onSave }) {
  const [form, setForm] = useState(
    normalizeProfile(
      fresh
        ? {
            ...defaultProfile,
            units: profile.units || 'imperial',
            name: profile.name === 'Alex' ? '' : profile.name,
          }
        : profile,
    ),
  );
  const [tab, setTab] = useState('Physique');
  const [previewEmote, setPreviewEmote] = useState(null);
  const units = form.units;
  const previewTimer = useRef();
  useEffect(() => () => clearTimeout(previewTimer.current), []);
  const tryEmote = (kind) => {
    clearTimeout(previewTimer.current);
    setPreviewEmote({ kind, id: Date.now() });
    previewTimer.current = setTimeout(() => setPreviewEmote(null), 4200);
  };
  const [replace, setReplace] = useState(false);
  const [lean, setLean] = useState('');
  const [error, setError] = useState('');
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const metric = (k, v) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      const ffmi =
        (Number(next.weight) * (1 - Number(next.bodyFat) / 100)) / (Number(next.height) / 100) ** 2;
      if (Number(next.height) > 0 && Number(next.weight) > 0 && Number.isFinite(ffmi))
        next.muscle = clamp((ffmi - 14) / 13, 0.15, 1.15);
      return next;
    });
  const selectPreset = (preset) => {
    setForm((f) => ({
      ...f,
      preset: preset.id,
      muscle: preset.muscle,
      weight: preset.weight,
      bodyFat: preset.bodyFat,
    }));
    setLean('');
  };
  return (
    <Modal
      title={fresh ? 'Your next chapter starts here.' : 'Make it your own.'}
      subtitle="Choose a foundation. Then fine-tune the details."
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            ![
              [form.height, 100, 240],
              [form.weight, 30, 300],
              [form.bodyFat, 5, 55],
            ].every(
              ([v, min, max]) => Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max,
            )
          ) {
            setTab('Details');
            setError('Please enter height, weight and body fat within the allowed ranges.');
            return;
          }
          onSave({
            ...form,
            name: form.name.trim() || 'Athlete',
            height: Number(form.height),
            weight: Number(form.weight),
            bodyFat: Number(form.bodyFat),
          });
        }}
      >
        <div className="customizer-layout">
          <div className="customizer-preview">
            <div className="customizer-word">YOU.</div>
            <Avatar
              profile={{
                ...form,
                height: Number(form.height) || 178,
                weight: Number(form.weight) || 78,
                bodyFat: Number(form.bodyFat) || 16,
              }}
              small
              emote={previewEmote}
            />
            <span className="preview-caption">DRAG TO ROTATE · ANIME STUDIO</span>
          </div>
          <div className="customizer-fields">
            <div className="segmented">
              {['Physique', 'Details', 'Style', 'Outfit'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTab(t)}
                  className={tab === t ? 'selected' : ''}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === 'Physique' && (
              <>
                <label className="field-label">Start with a template</label>
                <div className="physique-presets">
                  {PRESETS.map((p) => (
                    <button
                      type="button"
                      className={form.preset === p.id ? 'selected' : ''}
                      key={p.id}
                      onClick={() => selectPreset(p)}
                    >
                      <span
                        className="preset-silhouette"
                        style={{ '--body-width': `${13 + p.muscle * 9}px` }}
                      >
                        <i />
                        <b />
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.subtitle}</small>
                      </span>
                      {form.preset === p.id ? <Check size={16} /> : <ChevronRight size={15} />}
                    </button>
                  ))}
                </div>
                <p className="small muted">
                  A starting point, not a label. You can adjust everything to feel more like you.
                </p>
              </>
            )}
            {tab === 'Details' && (
              <>
                <UnitSwitch value={units} onChange={(v) => update('units', v)} />
                <Field label="Your name">
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    maxLength={30}
                    placeholder="What should we call you?"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Height" suffix={heightUnit(units)}>
                    <MeasurementInput
                      kind="height"
                      units={units}
                      min={100}
                      max={240}
                      value={form.height}
                      onChange={(v) => metric('height', v)}
                    />
                  </Field>
                  <Field label="Body weight" suffix={weightUnit(units)}>
                    <MeasurementInput
                      units={units}
                      min={30}
                      max={300}
                      value={form.weight}
                      onChange={(v) => metric('weight', v)}
                    />
                  </Field>
                  <NumberField
                    label="Body fat"
                    suffix="%"
                    min={5}
                    max={55}
                    step={0.1}
                    value={form.bodyFat}
                    onChange={(v) => metric('bodyFat', v)}
                  />
                  <Field label="Lean mass (optional)" suffix={weightUnit(units)}>
                    <MeasurementInput
                      units={units}
                      min={15}
                      max={Number(form.weight) * 0.95}
                      required={false}
                      value={lean}
                      onChange={(v) => {
                        setLean(v);
                        if (v && form.weight)
                          metric('bodyFat', round(clamp((1 - v / form.weight) * 100, 5, 55)));
                      }}
                    />
                  </Field>
                </div>
                <Field label="Your focus">
                  <select value={form.goal} onChange={(e) => update('goal', e.target.value)}>
                    {[
                      'Build muscle',
                      'Lose body fat',
                      'Body recomposition',
                      'Maintain & perform',
                    ].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <p className="small muted">
                  BMI:{' '}
                  {form.height && form.weight ? round(form.weight / (form.height / 100) ** 2) : '—'}{' '}
                  · Calculated lean mass:{' '}
                  {formatWeight(form.weight * (1 - form.bodyFat / 100), units)}. Leave preset values
                  if you don’t know yet.
                </p>
              </>
            )}
            {tab === 'Style' && (
              <>
                <label className="field-label">Body frame</label>
                <div className="frame-picker">
                  {['classic', 'curved'].map((frame) => (
                    <button
                      type="button"
                      key={frame}
                      className={form.frame === frame ? 'selected' : ''}
                      onClick={() => update('frame', frame)}
                    >
                      <UserRound size={18} />
                      {frame}
                    </button>
                  ))}
                </div>
                <label className="field-label">Hairstyle</label>
                <div className="hair-picker">
                  {HAIRSTYLES.map((h) => (
                    <button
                      type="button"
                      key={h.id}
                      aria-pressed={form.hairStyle === h.id}
                      className={form.hairStyle === h.id ? 'selected' : ''}
                      onClick={() => update('hairStyle', h.id)}
                    >
                      <span className={'hair-icon hair-' + h.id} />
                      <span>{h.name}</span>
                      {form.hairStyle === h.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <ColorChoices
                  label="Hair color"
                  value={form.hairColor}
                  colors={[
                    '#242638',
                    '#694538',
                    '#d8b966',
                    '#ede9dc',
                    '#aa4554',
                    '#578c91',
                    '#8470b7',
                  ]}
                  onChange={(v) => update('hairColor', v)}
                />
                <ColorChoices
                  label="Skin color"
                  value={form.skin}
                  colors={['#efd2b5', '#d3a17c', '#b97d59', '#905e44', '#654536', '#c6d3db']}
                  onChange={(v) => update('skin', v)}
                />
                <ColorChoices
                  label="Eye color"
                  value={form.eyeColor}
                  colors={['#457e8a', '#627e48', '#7b563d', '#9c83c6', '#bb984b', '#3c3944']}
                  onChange={(v) => update('eyeColor', v)}
                />
              </>
            )}
            {tab === 'Outfit' && (
              <>
                <span className="field-label">Choose your training look</span>
                <div className="outfit-picker">
                  {OUTFITS.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      aria-pressed={form.outfit === o.id}
                      className={form.outfit === o.id ? 'selected' : ''}
                      onClick={() => update('outfit', o.id)}
                    >
                      <span>
                        <strong>{o.name}</strong>
                        <small>{o.description}</small>
                      </span>
                      {form.outfit === o.id ? <Check size={15} /> : <ChevronRight size={15} />}
                    </button>
                  ))}
                </div>
                {form.outfit !== 'physique' && (
                  <>
                    <ColorChoices
                      label="Clothing color"
                      value={form.outfitColor}
                      colors={['#384559', '#d87544', '#66528c', '#307a70', '#c4c8b8', '#8e485e']}
                      onChange={(v) => update('outfitColor', v)}
                    />
                    <ColorChoices
                      label="Accent color"
                      value={form.accentColor}
                      colors={['#d6ed86', '#f2cc71', '#7ec6df', '#f2efdf', '#ee91a2', '#4b4b66']}
                      onChange={(v) => update('accentColor', v)}
                    />
                  </>
                )}
                <div className="emote-preview-buttons">
                  <button type="button" onClick={() => tryEmote('meal')}>
                    Preview bite
                  </button>
                  <button type="button" onClick={() => tryEmote('workout')}>
                    Preview power-up
                  </button>
                </div>
                <p className="small muted">
                  Physique view removes the outfit and uses smooth, non-sexual mannequin anatomy to
                  show your proportions.
                </p>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {fresh && (
          <>
            <Field label="Your name">
              <input
                required
                placeholder="What should we call you?"
                value={form.name}
                maxLength={30}
                onChange={(e) => update('name', e.target.value)}
              />
            </Field>
            <label className="check-label replace-check">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
                required
              />{' '}
              Start fresh and replace the current local journey, including demo data.
            </label>
          </>
        )}
        <div className="modal-footer">
          <span className="small muted">
            {fresh
              ? 'Your logs stay on this device.'
              : 'Baseline edits recalculate the character simulation.'}
          </span>
          <Button type="submit" disabled={fresh && !replace}>
            {fresh ? 'Let’s build' : 'Save character'}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CheckinModal({ profile, date, onClose, onSave }) {
  const units = useUnits();
  const [form, setForm] = useState({ date, weight: profile.weight, bodyFat: profile.bodyFat });
  return (
    <Modal
      title="Check in with yourself."
      subtitle="Record real measurements to track your actual progress."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <div className="form-grid">
          <Field label="Date" className="span-2">
            <input
              type="date"
              value={form.date}
              max={dateKey()}
              required
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field label="Body weight" suffix={weightUnit(units)}>
            <MeasurementInput
              units={units}
              min={30}
              max={300}
              value={form.weight}
              onChange={(v) => setForm((f) => ({ ...f, weight: v }))}
            />
          </Field>
          <NumberField
            label="Body fat"
            suffix="%"
            min={5}
            max={55}
            step={0.1}
            value={form.bodyFat}
            onChange={(v) => setForm((f) => ({ ...f, bodyFat: v }))}
          />
        </div>
        <p className="small muted">
          A check-in on the same date replaces that day’s previous measurement. These measurements
          are shown separately from the character simulation.
        </p>
        <div className="modal-footer">
          <span />
          <Button type="submit">
            Save check-in <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SettingsModal({ profile, status, onClose, onSave, onExport, onImport, onReset }) {
  const [form, setForm] = useState(profile),
    [error, setError] = useState(''),
    [pending, setPending] = useState(null);
  const file = useRef();
  const importFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    try {
      if (f.size > 5 * 1024 * 1024) throw new Error('Backup must be smaller than 5 MB.');
      const parsed = JSON.parse(await f.text());
      if (!validState(parsed))
        throw new Error('This isn’t a valid FORM backup. Your existing data has not changed.');
      setPending(parsed);
    } catch (err) {
      setError(err.message);
    }
    e.target.value = '';
  };
  return (
    <Modal title="Make FORM work for you." onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <h3 className="settings-section-title">Measurements</h3>
        <UnitSwitch
          value={form.units || 'imperial'}
          onChange={(units) => setForm((f) => ({ ...f, units }))}
        />
        <p className="small muted">
          Body measurements, lifting weights, water, and progress charts convert together. Your
          saved data keeps its original precision. Nutrition macros stay in grams.
        </p>
        <div className="settings-divider" />
        <h3 className="settings-section-title">Character celebrations</h3>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.animations !== false}
            onChange={(e) => setForm((f) => ({ ...f, animations: e.target.checked }))}
          />{' '}
          Play a short bite or power-up after logging
        </label>
        <p className="small muted">
          You can skip every sequence. Reduced-motion preferences are respected.
        </p>
        <div className="settings-divider" />
        <h3 className="settings-section-title">Your daily targets</h3>
        <p className="small muted">
          Choose targets that fit your own plan. Defaults are examples, not personalized
          recommendations.
        </p>
        <div className="form-grid">
          {[
            ['calorieTarget', 'Calories', 'kcal', 500, 10000],
            ['proteinTarget', 'Protein', 'g', 10, 1000],
            ['carbTarget', 'Carbs', 'g', 10, 1500],
            ['fatTarget', 'Fats', 'g', 10, 500],
            ['maintenance', 'Estimated maintenance', 'kcal', 500, 10000],
          ].map(([k, label, suffix, min, max]) => (
            <NumberField
              key={k}
              label={label}
              suffix={suffix}
              min={min}
              max={max}
              value={form[k]}
              onChange={(v) => setForm((f) => ({ ...f, [k]: v }))}
            />
          ))}
        </div>
        <p className="small muted">
          Maintenance is used only for the character’s illustrative energy balance. Food days must
          be marked complete before they affect simulated fat change.
        </p>
        <div className="settings-divider" />
        <h3 className="settings-section-title">
          <Sparkles size={17} /> Meal estimation{' '}
          <span className={`status-pill ${status.ai ? 'connected' : ''}`}>
            {status.ai ? 'AI connected' : 'Built-in available'}
          </span>
        </h3>
        <p className="small muted">
          The built-in food reference works without a key. To enable AI, add{' '}
          <code>OPENAI_API_KEY</code> to the server’s <code>.env</code> file and restart the app.
          Keys stay on the server. AI requests may incur API charges.
        </p>
        <div className="settings-divider" />
        <h3 className="settings-section-title">Your data, your device</h3>
        <p className="small muted">
          Saved in this browser. Export a backup before clearing browser data or moving devices.
        </p>
        <div className="data-actions">
          <Button type="button" secondary onClick={onExport}>
            <Download size={16} /> Export backup
          </Button>
          <Button type="button" secondary onClick={() => file.current.click()}>
            <Upload size={16} /> Import backup
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={importFile}
          />
        </div>
        {pending && (
          <div className="note-box">
            <span>Replace your current journey with {pending.profile.name}’s backup?</span>
            <Button type="button" onClick={() => onImport(pending)}>
              Restore
            </Button>
            <button type="button" className="text-button" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="text-button reset-link" onClick={onReset}>
          Start a new journey <ArrowRight size={14} />
        </button>
        <div className="modal-footer">
          <span className="small muted">No account needed.</span>
          <Button type="submit">
            Save settings <Check size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function InfoModal({ onClose }) {
  return (
    <Modal
      title="Built by your everyday."
      subtitle="A little about how your character grows."
      onClose={onClose}
    >
      <div className="info-sections">
        <div>
          <span className="accent-icon">
            <UserRound size={22} />
          </span>
          <section>
            <h3>A character with your starting point</h3>
            <p>
              Pick a physique, enter measurements, and customize the look. Weight, height, and body
              fat help approximate the proportions of a stylized 3D character.
            </p>
          </section>
        </div>
        <div>
          <span className="accent-icon">
            <Dumbbell size={22} />
          </span>
          <section>
            <h3>Gradual, muscle-specific change</h3>
            <p>
              Strength sessions influence the muscles you trained. Protein, logged energy and rest
              between sessions influence the simulation. Each muscle can progress only once per day,
              with a small capped change. Highlights simply show which muscles you trained.
            </p>
          </section>
        </div>
        <div>
          <span className="accent-icon">
            <Leaf size={22} />
          </span>
          <section>
            <h3>Missing meals don’t mean a deficit</h3>
            <p>
              Only food days you mark complete contribute to simulated fat change. Unlogged days are
              ignored. The model uses your maintenance setting, not an inferred metabolic
              measurement.
            </p>
          </section>
        </div>
        <div>
          <span className="accent-icon">
            <ShieldCheck size={22} />
          </span>
          <section>
            <h3>Motivation, with honest expectations</h3>
            <p>
              This is an illustrative game model, not a validated prediction of muscle, fat or
              health. The app can’t know your genetics, training intensity, recovery, or actual
              energy needs. Record real check-ins to track your body separately.
            </p>
          </section>
        </div>
        <div>
          <span className="accent-icon">
            <Sparkles size={22} />
          </span>
          <section>
            <h3>Food estimates stay editable</h3>
            <p>
              The built-in estimator uses generic foods and approximate serving sizes. Optional AI
              also makes estimates, not verified product lookups. Review the assumptions and use a
              product’s label when you have it.
            </p>
          </section>
        </div>
      </div>
      <div className="modal-footer">
        <span className="small muted">One day. One rep. One meal.</span>
        <Button onClick={onClose}>
          Let’s keep building <ArrowRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}

function ColorChoices({ label, value, colors, onChange }) {
  return (
    <div className="color-choice-section">
      <span className="field-label">{label}</span>
      <div className="color-picker">
        {colors.map((c) => (
          <button
            type="button"
            key={c}
            style={{ background: c }}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            className={value === c ? 'selected' : ''}
            onClick={() => onChange(c)}
          >
            {value === c && <Check size={14} />}
          </button>
        ))}
        <label className="custom-color" title={`Custom ${label.toLowerCase()}`}>
          <span>+</span>
          <input
            type="color"
            aria-label={`Custom ${label.toLowerCase()}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
