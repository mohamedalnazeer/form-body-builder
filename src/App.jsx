import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  Flame,
  LayoutDashboard,
  Leaf,
  Menu,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Utensils,
  X,
  Droplets,
  Download,
  Upload,
  Trash2,
  Clock3,
  MoveUpRight,
  CheckCheck,
  ShieldCheck,
} from 'lucide-react';
import Avatar from './UnityAvatar.jsx';
import { UnitContext, useUnits, UnitSwitch } from './UnitControls.jsx';
import {
  weightValue,
  weightUnit,
  formatWeight,
  formatHeight,
  displayNumber,
  OZ_PER_L,
} from './units.js';
import { normalizeProfile } from './character/config.js';
import Celebration from './Celebration.jsx';
import {
  STORAGE_KEY,
  MUSCLES,
  WORKOUTS,
  dateKey,
  shiftDate,
  prettyDate,
  createDemo,
  totalMacros,
  emptyDay,
  simulate,
  streak,
  round,
  clamp,
  validState,
  uid,
} from './domain.js';
import {
  MealModal,
  WorkoutModal,
  ProfileModal,
  CheckinModal,
  SettingsModal,
  InfoModal,
} from './Modals.jsx';

const navItems = [
  { id: 'Overview', icon: LayoutDashboard },
  { id: 'My physique', icon: UserRound },
  { id: 'Nutrition', icon: Utensils },
  { id: 'Training', icon: Dumbbell },
  { id: 'Progress', icon: TrendingUp },
];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validState(parsed)) return { ...parsed, profile: normalizeProfile(parsed.profile) };
    }
  } catch {}
  return createDemo();
}
export function Button({ children, onClick, secondary = false, className = '', ...rest }) {
  return (
    <button
      className={`button ${secondary ? 'secondary' : 'primary'} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
export function IconButton({ children, label, ...rest }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}
export function ProgressBar({ value, max = 100, color = 'var(--lime)' }) {
  return (
    <div className="progress-track">
      <span
        style={{ width: `${clamp((value / Math.max(max, 1)) * 100, 0, 100)}%`, background: color }}
      />
    </div>
  );
}
export function CardHeading({ eyebrow, title, children }) {
  return (
    <div className="card-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(readState);
  const [tab, setTab] = useState('Overview');
  const [date, setDate] = useState(dateKey());
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [view, setView] = useState('front');
  const [viewRevision, setViewRevision] = useState(0);
  const [showMuscles, setShowMuscles] = useState(false);
  const [baseline, setBaseline] = useState(false);
  const [status, setStatus] = useState({ ai: false });
  const [storageError, setStorageError] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const today = dateKey();
  const p = useMemo(() => normalizeProfile(data.profile), [data.profile]);
  const units = p.units;
  const celebrate = (kind) => {
    if (p.animations && !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      setCelebration({ kind, id: uid(), before: sim });
  };
  const day = data.logs[date] || emptyDay();
  const totals = totalMacros(day.meals);
  const sim = useMemo(() => simulate(p, data.logs, date), [p, data.logs, date]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [data]);
  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  const notify = (text) => setToast(text);
  const updateDay = (fn) =>
    setData((d) => ({ ...d, logs: { ...d.logs, [date]: fn(d.logs[date] || emptyDay()) } }));
  const navigate = (id) => {
    setTab(id);
    setMobileMenu(false);
  };
  const loggedDays = Object.values(data.logs).filter(
    (d) => d.meals.length || d.workouts.length,
  ).length;
  const recentMuscles = day.workouts.flatMap((w) => w.muscles);
  const sevenDays = Array.from({ length: 7 }, (_, i) => shiftDate(date, i - 6));
  const workoutsWeek = sevenDays.reduce(
    (sum, key) => sum + (data.logs[key]?.workouts.filter((w) => w.name !== 'Recovery').length || 0),
    0,
  );
  const addMeal = (meal) => {
    updateDay((d) => ({
      ...d,
      meals: modal?.meal
        ? d.meals.map((m) => (m.id === modal.meal.id ? { ...meal, id: m.id } : m))
        : [...d.meals, { ...meal, id: uid() }],
    }));
    setModal(null);
    notify(modal?.meal ? 'Meal updated.' : 'Meal logged. Another small step.');
    if (!modal?.meal) celebrate('meal');
  };
  const addWorkout = (workout) => {
    updateDay((d) => ({ ...d, workouts: [...d.workouts, { ...workout, id: uid() }] }));
    setModal(null);
    notify('Workout saved. You showed up.');
    celebrate(workout.name === 'Recovery' ? 'recovery' : 'workout');
  };
  const removeMeal = (id) => {
    updateDay((d) => ({ ...d, meals: d.meals.filter((m) => m.id !== id) }));
    notify('Meal removed.');
  };
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-backup-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Your backup has been downloaded.');
  };

  const physique = (
    <section className={`card physique-card ${tab === 'My physique' ? 'expanded-physique' : ''}`}>
      <CardHeading eyebrow="THE BIGGER PICTURE" title="Your physique">
        <IconButton label="Customize character" onClick={() => setModal({ type: 'profile' })}>
          <SlidersHorizontal size={18} />
        </IconButton>
      </CardHeading>
      <div className="physique-subline">
        <span className="live-dot" /> {baseline ? 'Starting physique' : 'Your evolving form'}
        <span className="tag">3D MODEL</span>
      </div>
      <div className="avatar-stage">
        <div className="stage-grid" />
        <span className="stage-word">FORM</span>
        <div className="avatar-canvas">
          <Avatar
            resetToken={viewRevision}
            emote={celebration}
            profile={p}
            progress={baseline ? null : celebration?.before || sim}
            view={view}
            highlight={showMuscles ? recentMuscles : []}
          />
        </div>
        <div className="avatar-level">
          <span className="tiny-label">
            CHAPTER {String(Math.floor(loggedDays / 30) + 1).padStart(2, '0')}
          </span>
          <strong>{p.preset === 'beginner' ? 'The beginning' : 'Building momentum'}</strong>
        </div>
        <button
          className={`muscle-toggle ${showMuscles ? 'active' : ''}`}
          onClick={() => setShowMuscles(!showMuscles)}
          title="Highlight muscles trained on this day"
        >
          <Activity size={16} /> Muscle focus
        </button>
        <div className="stage-coordinate">
          X 00.0
          <br />Y 00.0
          <br />Z 00.0
        </div>
        <div className="view-controls">
          {['front', 'side', 'back'].map((v) => (
            <button
              key={v}
              className={view === v ? 'selected' : ''}
              onClick={() => {
                setView(v);
                setViewRevision((n) => n + 1);
              }}
            >
              {v}
            </button>
          ))}
          <span />
          <IconButton
            label="Reset character view"
            onClick={() => {
              setView('front');
              setViewRevision((n) => n + 1);
              setBaseline(false);
            }}
          >
            <RotateCcw size={13} />
          </IconButton>
        </div>
      </div>
      <div className="physique-metrics">
        <div>
          <span>Starting weight</span>
          <strong>
            {displayNumber(weightValue(p.weight, units))}
            <small> {weightUnit(units)}</small>
          </strong>
        </div>
        <div>
          <span>Starting body fat</span>
          <strong>
            {p.bodyFat}
            <small> %</small>
          </strong>
        </div>
        <div>
          <span>Training days</span>
          <strong>
            {sim.trainedDays}
            <small> days</small>
          </strong>
        </div>
      </div>
      <div className="physique-footer">
        <span>
          <span className="live-dot" /> Small changes. Built over time.
        </span>
        <button
          className="text-button"
          aria-label="How the physique simulation works"
          onClick={() => setModal({ type: 'info' })}
        >
          <CircleHelp size={15} />
        </button>
      </div>
    </section>
  );

  const nutrition = (
    <section className="card nutrition-card">
      <CardHeading title="Daily nutrition">
        <button className="text-button" onClick={() => setModal({ type: 'settings' })}>
          Your targets <ArrowUpRight size={15} />
        </button>
      </CardHeading>
      <div className="nutrition-main">
        <div className="calorie-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="ring-bg" />
            <circle
              cx="60"
              cy="60"
              r="52"
              className="ring-value"
              strokeDasharray={`${clamp(totals.calories / p.calorieTarget, 0, 1) * 326.7} 326.7`}
            />
          </svg>
          <div>
            <Flame size={18} />
            <strong>{fmt(totals.calories)}</strong>
            <span>of {fmt(p.calorieTarget)} kcal</span>
          </div>
        </div>
        <div className="macro-list">
          {[
            { name: 'Protein', key: 'protein', target: p.proteinTarget, color: 'var(--lime)' },
            { name: 'Carbs', key: 'carbs', target: p.carbTarget, color: 'var(--purple)' },
            { name: 'Fats', key: 'fat', target: p.fatTarget, color: 'var(--peach)' },
          ].map((m) => (
            <div className="macro" key={m.key}>
              <div>
                <span>
                  <i style={{ background: m.color }} />
                  {m.name}
                </span>
                <span>
                  <b>{fmt(totals[m.key])}</b> / {m.target} g
                </span>
              </div>
              <ProgressBar value={totals[m.key]} max={m.target} color={m.color} />
            </div>
          ))}
        </div>
      </div>
      <div className="nutrition-foot">
        <span>
          {Math.max(0, Math.round(p.calorieTarget - totals.calories)).toLocaleString()} kcal
          remaining
        </span>
        <span>{round((totals.protein / p.proteinTarget) * 100, 0)}% of protein target</span>
      </div>
    </section>
  );

  const mealList = (
    <section className="card meals-card">
      <CardHeading title="On the menu">
        <span className="muted small">{day.meals.length} meals logged</span>
      </CardHeading>
      <div className="meal-list">
        {day.meals.length ? (
          day.meals.map((meal, i) => (
            <div className="meal-row" key={meal.id}>
              <div className={`meal-icon meal-${meal.category?.toLowerCase()}`}>
                <MealArt kind={meal.category} />
              </div>
              <button className="meal-title" onClick={() => setModal({ type: 'meal', meal })}>
                <span className="tiny-label">
                  {meal.category || 'Meal'} {meal.time ? <span>· {meal.time}</span> : null}
                </span>
                <strong>{meal.name}</strong>
                <span>
                  {meal.protein}g protein <i /> {meal.carbs}g carbs <i /> {meal.fat}g fat
                </span>
              </button>
              <div className="meal-cal">
                <strong>{fmt(meal.calories)}</strong>
                <span>kcal</span>
              </div>
              <IconButton label={`Delete ${meal.name}`} onClick={() => removeMeal(meal.id)}>
                <Trash2 size={14} />
              </IconButton>
            </div>
          ))
        ) : (
          <Empty
            icon={Utensils}
            title="Fuel your next chapter."
            text="Your meals will appear here. Start with whatever you ate today."
          />
        )}
      </div>
      <button className="dashed-button" onClick={() => setModal({ type: 'meal' })}>
        <Plus size={16} /> Log a meal{' '}
        <span>
          <Sparkles size={12} /> Type it. Estimate it.
        </span>
      </button>
      {day.meals.length > 0 && (
        <button
          className={`complete-day ${day.complete ? 'is-complete' : ''}`}
          onClick={() => {
            updateDay((d) => ({ ...d, complete: !d.complete }));
            notify(day.complete ? 'Food log reopened.' : 'Food log marked complete.');
          }}
        >
          <CheckCheck size={14} />
          {day.complete ? 'Food log complete · Reopen' : 'Finished eating? Mark food log complete'}
          <CircleHelp size={12} />
        </button>
      )}
    </section>
  );

  const training = (
    <section className="card training-card">
      <CardHeading title={day.workouts.length ? 'Work put in' : 'Make your next move'}>
        <span className="icon-tile">
          <Dumbbell size={18} />
        </span>
      </CardHeading>
      {day.workouts.length ? (
        <div className="workout-list">
          {day.workouts.map((w) => (
            <div key={w.id} className="workout-entry">
              <div className="workout-entry-heading">
                <div>
                  <h3>{w.name}</h3>
                  <span className="muted small">
                    {w.duration} min · {w.exercises.length} exercises
                  </span>
                </div>
                <IconButton
                  label={`Delete ${w.name}`}
                  onClick={() => {
                    updateDay((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== w.id) }));
                    notify('Workout removed.');
                  }}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
              <div className="muscle-tags">
                {w.muscles.length ? (
                  w.muscles.map((m) => <span key={m}>{m}</span>)
                ) : (
                  <span>{w.name === 'Recovery' ? 'Rest & recover' : 'Conditioning'}</span>
                )}
              </div>
              {tab === 'Training' && (
                <div className="exercise-summary">
                  {w.exercises.map((e, i) => (
                    <div key={i}>
                      <span>{e.name}</span>
                      <span>
                        {e.sets} × {e.reps}
                        {e.weight > 0 ? ` · ${formatWeight(e.weight, units)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="training-empty">
          <div>
            <p>A little stronger, one session at a time.</p>
            <span>Log your training. Let your consistency take shape.</span>
          </div>
          <div className="dumbbell-art">
            <Dumbbell size={63} strokeWidth={1.15} />
          </div>
        </div>
      )}
      <button className="training-action" onClick={() => setModal({ type: 'workout' })}>
        <Plus size={16} /> Log a workout <ArrowUpRight size={16} />
      </button>
    </section>
  );

  return (
    <UnitContext.Provider value={units}>
      <div className="app-shell">
        <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate('Overview');
            }}
          >
            <img src="/favicon.svg" alt="" />
            <span>
              FORM<span className="brand-period">.</span>
            </span>
          </a>
          <div className="workspace-label">YOUR PERSONAL EVOLUTION</div>
          <nav aria-label="Main navigation">
            {navItems.map(({ id, icon: Icon }) => (
              <button
                key={id}
                aria-label={id}
                onClick={() => navigate(id)}
                className={`nav-item ${tab === id ? 'active' : ''}`}
              >
                <Icon size={19} />
                <span>{id}</span>
                {id === 'Overview' && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="consistency-card">
              <div className="consistency-icon">
                <Flame size={21} />
                <span>{streak(data.logs)}</span>
              </div>
              <strong>Keep showing up.</strong>
              <p>
                Every small effort becomes
                <br />
                part of the bigger picture.
              </p>
              <div className="streak-days">
                {sevenDays.map((d) => (
                  <span
                    key={d}
                    className={
                      data.logs[d]?.meals.length || data.logs[d]?.workouts.length ? 'done' : ''
                    }
                  >
                    {data.logs[d]?.meals.length || data.logs[d]?.workouts.length ? (
                      <Check size={10} />
                    ) : (
                      '·'
                    )}
                  </span>
                ))}
              </div>
              <span className="tiny-label">YOUR LAST 7 DAYS</span>
            </div>
            <button className="nav-item" onClick={() => setModal({ type: 'info' })}>
              <CircleHelp size={18} /> How FORM works
            </button>
            <button className="nav-item" onClick={() => setModal({ type: 'settings' })}>
              <Settings2 size={18} /> Settings
            </button>
            <button className="profile-button" onClick={() => setModal({ type: 'profile' })}>
              <span className="user-avatar">{p.name.slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{p.name}</strong>
                <small>{p.goal}</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </aside>
        {mobileMenu && (
          <button
            className="mobile-scrim"
            aria-label="Close navigation"
            onClick={() => setMobileMenu(false)}
          />
        )}
        <main className="main">
          <header className="topbar">
            <div className="breadcrumb">
              <IconButton
                label="Open navigation"
                className="icon-button mobile-menu"
                onClick={() => setMobileMenu(true)}
              >
                <Menu size={20} />
              </IconButton>
              <span>Your workspace</span>
              <ChevronRight size={13} />
              <strong>{tab}</strong>
            </div>
            <div className="topbar-right">
              <button
                className="quick-units"
                title="Switch measurement units"
                aria-label={`Switch to ${units === 'imperial' ? 'metric' : 'US'} units`}
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    profile: { ...d.profile, units: units === 'imperial' ? 'metric' : 'imperial' },
                  }))
                }
              >
                {units === 'imperial' ? 'lb / in' : 'kg / cm'}
              </button>
              <span className="saved-label">
                <span className="live-dot" />
                {storageError ? 'Not saved — storage full' : 'Saved on this device'}
              </span>
              <button
                className="top-avatar"
                onClick={() => setModal({ type: 'profile' })}
                aria-label="Edit profile"
              >
                {p.name.slice(0, 1)}
              </button>
            </div>
          </header>
          <div className="page-content">
            {data.demo && (
              <div className="demo-banner">
                <span>
                  <Sparkles size={14} /> You’re exploring a demo. Make this journey yours.
                </span>
                <button onClick={() => setModal({ type: 'profile', fresh: true })}>
                  Create my character <ArrowRight size={14} />
                </button>
              </div>
            )}
            {storageError && (
              <div className="error-box">
                Changes can’t be saved in this browser. Export a backup in Settings before leaving.
              </div>
            )}
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  {tab === 'Overview'
                    ? `LET’S BUILD, ${p.name.toUpperCase()}`
                    : 'BUILT BY YOUR EVERYDAY'}
                </span>
                <h1>
                  {
                    {
                      Overview: 'Your effort. Taking shape.',
                      'My physique': 'Meet your evolving self.',
                      Nutrition: 'Fuel the work.',
                      Training: 'Put in the work.',
                      Progress: 'Small steps. Real consistency.',
                    }[tab]
                  }
                </h1>
                <p>
                  {
                    {
                      Overview: 'A stronger version of you starts with what you do today.',
                      'My physique': 'Your starting point, your character, your journey.',
                      Nutrition: 'Every meal is a little piece of the bigger picture.',
                      Training: 'Show up. Log it. Build a habit that lasts.',
                      Progress: 'Look at how far you’ve come, one day at a time.',
                    }[tab]
                  }
                </p>
              </div>
              <div className="date-selector">
                <IconButton label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
                  <ChevronLeft size={16} />
                </IconButton>
                <label>
                  <CalendarDays size={16} />
                  <span>
                    {date === today ? 'Today, ' : ''}
                    {prettyDate(date)}
                  </span>
                  <input
                    aria-label="View date"
                    type="date"
                    value={date}
                    max={today}
                    onChange={(e) =>
                      e.target.value && setDate(e.target.value > today ? today : e.target.value)
                    }
                  />
                </label>
                <IconButton
                  label="Next day"
                  disabled={date >= today}
                  onClick={() => setDate(shiftDate(date, 1))}
                >
                  <ChevronRight size={16} />
                </IconButton>
              </div>
            </div>

            {tab === 'Overview' && (
              <>
                <div className="stats-grid">
                  <Stat
                    icon={Flame}
                    label="CALORIES IN"
                    value={fmt(totals.calories)}
                    unit="kcal"
                    note={`of ${fmt(p.calorieTarget)} daily target`}
                    color="lime"
                    progress={totals.calories / p.calorieTarget}
                  />
                  <Stat
                    icon={Leaf}
                    label="PROTEIN"
                    value={fmt(totals.protein)}
                    unit="g"
                    note={`${Math.max(0, p.proteinTarget - totals.protein)}g left to your target`}
                    color="purple"
                    progress={totals.protein / p.proteinTarget}
                  />
                  <Stat
                    icon={Dumbbell}
                    label="THIS WEEK"
                    value={workoutsWeek}
                    unit="sessions"
                    note="Your last 7 days of training"
                    color="peach"
                  />
                  <Stat
                    icon={Flame}
                    label="SHOWING UP"
                    value={streak(data.logs)}
                    unit="day streak"
                    note="Consistency looks good on you"
                    color="blue"
                  />
                </div>
                <div className="dashboard-grid">
                  {physique}
                  <div className="daily-column">
                    {nutrition}
                    {mealList}
                    {training}
                  </div>
                </div>
                <div className="bottom-grid">
                  <ConsistencyCard data={data} date={date} onDate={setDate} />
                  <WaterCard day={day} updateDay={updateDay} />
                  <div className="card thought-card">
                    <span className="eyebrow">THE FORM MINDSET</span>
                    <p>
                      Progress isn’t always loud.
                      <br />
                      <em>Keep building anyway.</em>
                    </p>
                    <span>ONE DAY. ONE REP. ONE MEAL.</span>
                    <span className="thought-star">✳</span>
                  </div>
                </div>
              </>
            )}
            {tab === 'Nutrition' && (
              <div className="nutrition-page">
                <div>
                  {nutrition}
                  {mealList}
                </div>
                <div>
                  <div className="card quick-estimate">
                    <div className="accent-icon">
                      <Sparkles size={26} />
                    </div>
                    <span className="eyebrow">LESS MATH. MORE MOMENTUM.</span>
                    <h2>
                      Just tell us
                      <br />
                      what you ate.
                    </h2>
                    <p>
                      “200g chicken, 150g rice and broccoli.”
                      <br />
                      Get an estimate, adjust it, and you’re done.
                    </p>
                    <Button onClick={() => setModal({ type: 'meal', estimate: true })}>
                      Estimate a meal <ArrowUpRight size={16} />
                    </Button>
                    <small>
                      {status.ai
                        ? 'AI available · Meal text is sent only when you choose AI.'
                        : 'Built-in estimates available. AI can be connected in Settings.'}
                    </small>
                  </div>
                  <WaterCard day={day} updateDay={updateDay} />
                </div>
              </div>
            )}
            {tab === 'Training' && (
              <div className="training-page">
                <div>
                  {training}
                  <div className="card">
                    <CardHeading eyebrow="A PLACE TO START" title="Pick your session" />
                    <div className="workout-presets">
                      {Object.entries(WORKOUTS).map(([name, w]) => (
                        <button
                          key={name}
                          onClick={() => setModal({ type: 'workout', preset: name })}
                        >
                          <span className="icon-tile">
                            {name === 'Recovery' ? (
                              <Leaf />
                            ) : name === 'Cardio' ? (
                              <Activity />
                            ) : (
                              <Dumbbell />
                            )}
                          </span>
                          <strong>{name}</strong>
                          <span>
                            {w.muscles.join(' · ') ||
                              (name === 'Recovery'
                                ? 'Recharge for what’s next'
                                : 'Move at your own pace')}
                          </span>
                          <ArrowUpRight size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="card muscle-card">
                  <CardHeading title="A balanced week" />
                  <p className="muted">Muscle groups trained in your last 7 days.</p>
                  {MUSCLES.map((m) => {
                    const count = sevenDays.filter((d) =>
                      data.logs[d]?.workouts.some((w) => w.muscles.includes(m)),
                    ).length;
                    return (
                      <div className="muscle-row" key={m}>
                        <div>
                          <span>{m}</span>
                          <span>
                            {count} {count === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                        <ProgressBar value={count} max={7} />
                      </div>
                    );
                  })}
                  <div className="note-box">
                    <Leaf size={19} />
                    <span>
                      Recovery belongs in your routine, too. More logged sessions don’t mean instant
                      growth.
                    </span>
                  </div>
                </div>
              </div>
            )}
            {tab === 'My physique' && (
              <div className="character-page">
                {physique}
                <div>
                  <div className="card character-details">
                    <CardHeading eyebrow="YOUR STARTING POINT" title="Uniquely yours">
                      <UserRound size={20} />
                    </CardHeading>
                    <div className="detail-row">
                      <span>Physique template</span>
                      <strong>{p.preset[0].toUpperCase() + p.preset.slice(1)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Height</span>
                      <strong>{formatHeight(p.height, units)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Starting BMI</span>
                      <strong>{round(p.weight / (p.height / 100) ** 2)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Starting lean mass</span>
                      <strong>{formatWeight(p.weight * (1 - p.bodyFat / 100), units)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Focus</span>
                      <strong>{p.goal}</strong>
                    </div>
                    <Button secondary onClick={() => setModal({ type: 'profile' })}>
                      <SlidersHorizontal size={16} /> Customize character
                    </Button>
                  </div>
                  <div className="card">
                    <CardHeading title="Then & now" />
                    <p className="muted">
                      Compare your baseline with the gradual changes simulated from your logs.
                    </p>
                    <div className="segmented full">
                      <button
                        className={baseline ? 'selected' : ''}
                        onClick={() => setBaseline(true)}
                      >
                        Starting form
                      </button>
                      <button
                        className={!baseline ? 'selected' : ''}
                        onClick={() => setBaseline(false)}
                      >
                        Current form
                      </button>
                    </div>
                    <p className="small muted">
                      Early changes are intentionally subtle. Muscle highlights show today’s
                      training, not instant growth.
                    </p>
                  </div>
                  <div className="note-box">
                    <ShieldCheck size={22} />
                    <span>
                      Measurements help shape your character. This is a stylized avatar, not a body
                      scan or an exact prediction.
                    </span>
                  </div>
                </div>
              </div>
            )}
            {tab === 'Progress' && (
              <ProgressPage
                data={data}
                sim={sim}
                date={date}
                onCheckin={() => setModal({ type: 'checkin' })}
                onDate={setDate}
                onDeleteCheckin={(id) => {
                  setData((d) => ({ ...d, checkins: d.checkins.filter((c) => c.id !== id) }));
                  notify('Check-in removed.');
                }}
              />
            )}
            <footer className="page-footer">
              <span>
                <img src="/favicon.svg" alt="" /> Built by you. A little every day.
              </span>
              <button onClick={() => setModal({ type: 'info' })}>
                About the simulation <ArrowUpRight size={12} />
              </button>
            </footer>
          </div>
        </main>
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
            <button onClick={() => setToast('')} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        )}
        {modal?.type === 'meal' && (
          <MealModal
            initial={modal.meal}
            estimate={modal.estimate}
            status={status}
            onClose={() => setModal(null)}
            onSave={addMeal}
          />
        )}
        {modal?.type === 'workout' && (
          <WorkoutModal preset={modal.preset} onClose={() => setModal(null)} onSave={addWorkout} />
        )}
        {modal?.type === 'profile' && (
          <ProfileModal
            profile={p}
            fresh={modal.fresh}
            onClose={() => setModal(null)}
            onSave={(profile) => {
              setData((d) =>
                modal.fresh
                  ? {
                      version: 1,
                      demo: false,
                      profile: { ...profile, startDate: today },
                      logs: {},
                      checkins: [
                        {
                          id: uid(),
                          date: today,
                          weight: profile.weight,
                          bodyFat: profile.bodyFat,
                        },
                      ],
                    }
                  : { ...d, profile },
              );
              setModal(null);
              setBaseline(false);
              setDate(today);
              notify(
                modal.fresh ? 'Your journey starts here. Welcome to FORM.' : 'Character updated.',
              );
            }}
          />
        )}
        {modal?.type === 'checkin' && (
          <CheckinModal
            profile={p}
            date={date}
            onClose={() => setModal(null)}
            onSave={(checkin) => {
              setData((d) => ({
                ...d,
                checkins: [
                  ...d.checkins.filter((c) => c.date !== checkin.date),
                  { ...checkin, id: uid() },
                ].sort((a, b) => a.date.localeCompare(b.date)),
              }));
              setModal(null);
              notify('Real-world check-in saved.');
            }}
          />
        )}
        {modal?.type === 'settings' && (
          <SettingsModal
            profile={p}
            status={status}
            onClose={() => setModal(null)}
            onSave={(profile) => {
              setData((d) => ({ ...d, profile }));
              setModal(null);
              notify('Targets updated.');
            }}
            onExport={exportData}
            onImport={(value) => {
              setData({ ...value, profile: normalizeProfile(value.profile) });
              setModal(null);
              notify('Backup restored.');
            }}
            onReset={() => {
              setModal({ type: 'profile', fresh: true });
            }}
          />
        )}
        {modal?.type === 'info' && <InfoModal onClose={() => setModal(null)} />}
        {celebration && (
          <Celebration
            profile={p}
            progress={celebration.before}
            nextProgress={sim}
            event={celebration}
            onClose={() => setCelebration(null)}
          />
        )}
      </div>
    </UnitContext.Provider>
  );
}
function Stat({ icon: Icon, label, value, unit, note, color, progress }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={16} />
      </div>
      <div className="stat-value">
        {value}
        <span>{unit}</span>
      </div>
      <div className="stat-bottom">
        <span>{note}</span>
        {progress !== undefined ? (
          <div className="mini-progress">
            <span style={{ width: `${clamp(progress * 100, 0, 100)}%` }} />
          </div>
        ) : (
          <ArrowUpRight size={14} />
        )}
      </div>
    </div>
  );
}
function Empty({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={27} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function MealArt({ kind }) {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="31" r="23" fill="#d7d1bd" />
      <circle cx="30" cy="31" r="18" fill="#b8ad8a" />
      {kind === 'Lunch' || kind === 'Dinner' ? (
        <>
          <path d="M15 29c1-10 14-14 20-6s-5 20-12 17-10-7-8-11" fill="#cd9256" />
          <path d="m18 27 13 7m-10-12 13 7" stroke="#975e34" strokeWidth="2" />
          {[
            [40, 25],
            [41, 33],
            [35, 40],
            [38, 18],
          ].map(([x, y]) => (
            <circle key={y} cx={x} cy={y} r="5" fill="#59713f" />
          ))}
        </>
      ) : kind === 'Snack' ? (
        <>
          <circle cx="30" cy="30" r="17" fill="#eee5cf" />
          {[
            [22, 25],
            [34, 23],
            [39, 33],
            [27, 37],
            [21, 33],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="4" fill="#595772" />
          ))}
        </>
      ) : (
        <>
          <circle cx="30" cy="30" r="17" fill="#b99564" />
          {[
            [22, 24],
            [27, 29],
            [33, 34],
            [38, 39],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="5" fill="#e9d894" />
          ))}
          <path d="m32 19 8 7m-23 9 5 7" stroke="#725030" strokeWidth="3" />
        </>
      )}
    </svg>
  );
}
function WaterCard({ day, updateDay }) {
  const units = useUnits();
  return (
    <section className="card water-card">
      <div className="water-heading">
        <span className="icon-tile">
          <Droplets size={18} />
        </span>
        <span className="eyebrow">STAY IN YOUR FLOW</span>
      </div>
      <h2>
        {units === 'imperial' ? round(day.water * 0.25 * OZ_PER_L, 1) : round(day.water * 0.25, 2)}
        <span> {units === 'imperial' ? 'fl oz' : 'L'} of water</span>
      </h2>
      <div className="water-drops">
        {Array.from({ length: 8 }, (_, i) => (
          <Droplets
            key={i}
            size={19}
            fill={i < day.water ? '#a2c8d0' : 'none'}
            color={i < day.water ? '#a2c8d0' : '#454943'}
          />
        ))}
      </div>
      <div className="water-bottom">
        <span>Each glass = {units === 'imperial' ? '8.5 fl oz' : '250 ml'}</span>
        <div>
          <IconButton
            label="Remove glass of water"
            disabled={day.water <= 0}
            onClick={() => updateDay((d) => ({ ...d, water: Math.max(0, d.water - 1) }))}
          >
            −
          </IconButton>
          <IconButton
            label="Add glass of water"
            disabled={day.water >= 40}
            onClick={() => updateDay((d) => ({ ...d, water: Math.min(40, d.water + 1) }))}
          >
            <Plus size={15} />
          </IconButton>
        </div>
      </div>
    </section>
  );
}
function ConsistencyCard({ data, date, onDate }) {
  const days = Array.from({ length: 28 }, (_, i) => shiftDate(date, i - 27));
  return (
    <section className="card consistency-main">
      <CardHeading title="The art of showing up">
        <span className="small muted">Last 28 days</span>
      </CardHeading>
      <div className="heatmap">
        {days.map((d) => {
          const day = data.logs[d];
          const n = (day?.meals.length ? 1 : 0) + (day?.workouts.length ? 1 : 0);
          return (
            <button
              key={d}
              aria-label={`View ${prettyDate(d)}: ${n === 2 ? 'food and training' : n ? 'activity logged' : 'no logs'}`}
              title={`${prettyDate(d)} · ${n === 2 ? 'Food + training' : n ? 'Activity logged' : 'No logs'}`}
              className={`heat-${n} ${d === date ? 'current' : ''}`}
              onClick={() => onDate(d)}
            >
              {new Date(d + 'T12:00:00').getDate()}
            </button>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Every day adds up.</span>
        <span>
          Less <i />
          <i />
          <i /> More
        </span>
      </div>
    </section>
  );
}
function ProgressPage({ data, sim, date, onCheckin, onDate, onDeleteCheckin }) {
  const units = useUnits();
  const checks = data.checkins
    .filter((c) => c.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = checks[0],
    last = checks.at(-1);
  const values = checks.map((c) => c.weight),
    low = Math.min(...values, data.profile.weight) - 1,
    high = Math.max(...values, data.profile.weight) + 1;
  const start = first ? new Date(first.date + 'T12:00:00').getTime() : 0,
    end = last ? new Date(last.date + 'T12:00:00').getTime() : 1;
  const points = checks
    .map(
      (c) =>
        `${40 + ((new Date(c.date + 'T12:00:00').getTime() - start) / Math.max(1, end - start)) * 720},${175 - ((c.weight - low) / (high - low)) * 140}`,
    )
    .join(' ');
  return (
    <div className="progress-page">
      <div className="stats-grid">
        <Stat
          icon={CalendarDays}
          label="DAYS SHOWING UP"
          value={
            Object.entries(data.logs).filter(
              ([k, d]) => k <= date && (d.meals.length || d.workouts.length),
            ).length
          }
          unit="days"
          note="Built one day at a time"
          color="lime"
        />
        <Stat
          icon={Dumbbell}
          label="TRAINING DAYS"
          value={sim.trainedDays}
          unit="days"
          note="Unique days with strength work"
          color="peach"
        />
        <Stat
          icon={Target}
          label="LAST CHECK-IN"
          value={last ? displayNumber(weightValue(last.weight, units)) : '—'}
          unit={weightUnit(units)}
          note={last ? prettyDate(last.date) : 'Add your first check-in'}
          color="purple"
        />
        <Stat
          icon={TrendingUp}
          label="WEIGHT CHANGE"
          value={
            last && first
              ? `${last.weight - first.weight >= 0 ? '+' : ''}${displayNumber(weightValue(last.weight - first.weight, units))}`
              : '—'
          }
          unit={weightUnit(units)}
          note="From your recorded check-ins"
          color="blue"
        />
      </div>
      <div className="card">
        <CardHeading eyebrow="MEASURED BY YOU" title="Your real-world progress">
          <Button secondary onClick={onCheckin}>
            <Plus size={16} /> Add check-in
          </Button>
        </CardHeading>
        <p className="muted small">
          Body weight · {weightUnit(units)} {data.demo && '· Example measurements'}
        </p>
        {checks.length > 1 ? (
          <div className="weight-chart">
            <svg viewBox="0 0 800 220" role="img" aria-label="Body weight check-in chart">
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <line
                    x1="40"
                    x2="760"
                    y1={35 + i * 47}
                    y2={35 + i * 47}
                    stroke="#343930"
                    strokeDasharray="4 6"
                  />
                  <text x="0" y={40 + i * 47} fill="#8f9589" fontSize="11">
                    {displayNumber(weightValue(high - (i * (high - low)) / 3, units))}
                  </text>
                </g>
              ))}
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d8f36a" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#d8f36a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={`40,185 ${points} 760,185`} fill="url(#chartFill)" />
              <polyline points={points} fill="none" stroke="#d8f36a" strokeWidth="2.5" />
              {points.split(' ').map((point, i) => (
                <circle
                  key={i}
                  cx={point.split(',')[0]}
                  cy={point.split(',')[1]}
                  r="4"
                  fill="#d8f36a"
                />
              ))}
              <text x="40" y="214" fill="#8f9589" fontSize="11">
                {prettyDate(first.date)}
              </text>
              <text x="760" textAnchor="end" y="214" fill="#8f9589" fontSize="11">
                {prettyDate(last.date)}
              </text>
            </svg>
          </div>
        ) : (
          <Empty
            icon={TrendingUp}
            title="Give your progress a starting point."
            text="Add at least two check-ins to see your weight trend."
          />
        )}
      </div>
      <div className="progress-lower">
        <ConsistencyCard data={data} date={date} onDate={onDate} />
        <div className="card">
          <CardHeading eyebrow="ILLUSTRATIVE, NOT MEASURED" title="Character simulation" />
          <div className="simulation-numbers">
            <div>
              <strong>
                +{displayNumber(weightValue(sim.muscleKg, units), 2)}
                <small> {weightUnit(units)}</small>
              </strong>
              <span>Simulated muscle</span>
            </div>
            <div>
              <strong>
                {sim.fatKg >= 0 ? '+' : ''}
                {displayNumber(weightValue(sim.fatKg, units), 2)}
                <small> {weightUnit(units)}</small>
              </strong>
              <span>Simulated fat change</span>
            </div>
          </div>
          <p className="small muted">
            A conservative game model based on logged training and food. Your actual body can change
            differently. Check-ins above remain your source of measured progress.
          </p>
        </div>
      </div>
      <section className="card">
        <CardHeading title="Check-in history" />
        <div className="checkin-table">
          <div className="checkin-table-head">
            <span>Date</span>
            <span>Body weight</span>
            <span>Body fat</span>
            <span>Lean mass*</span>
            <span />
          </div>
          {checks
            .slice()
            .reverse()
            .map((c) => (
              <div key={c.id}>
                <span>{prettyDate(c.date, { year: 'numeric' })}</span>
                <strong>{formatWeight(c.weight, units)}</strong>
                <span>{c.bodyFat}%</span>
                <span>{formatWeight(c.weight * (1 - c.bodyFat / 100), units)}</span>
                <IconButton
                  label={`Delete check-in ${c.date}`}
                  onClick={() => onDeleteCheckin(c.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
          {!checks.length && <p className="muted">No check-ins yet.</p>}
        </div>
        <p className="small muted">
          *Calculated from the weight and body fat percentage you enter.
        </p>
      </section>
    </div>
  );
}
