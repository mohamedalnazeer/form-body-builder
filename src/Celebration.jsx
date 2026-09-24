import React, { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { EMOTE_DURATION, GAINS_APPLY_AT } from './character/motion.js';
export default function Celebration({ profile, progress, nextProgress, event, onClose }) {
  const [seconds, setSeconds] = useState(0),
    close = useRef();
  close.current = onClose;
  const dismiss = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    dismiss.current?.focus();
    const start = performance.now();
    const interval = setInterval(() => {
      const t = (performance.now() - start) / 1000;
      setSeconds(t);
      if (t >= EMOTE_DURATION) close.current();
    }, 50);
    const key = (e) => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        e.preventDefault();
        dismiss.current?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, [event.id]);
  const applied = seconds >= GAINS_APPLY_AT,
    meal = event.kind === 'meal',
    rest = event.kind === 'recovery';
  return (
    <div
      className={`celebration-backdrop ${applied ? 'applied' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={meal ? 'Meal celebration' : 'Workout celebration'}
    >
      <div className="celebration-card">
        <button ref={dismiss} className="celebration-skip" onClick={onClose}>
          Skip <X size={15} />
        </button>
        <span className="eyebrow">
          {applied
            ? 'ANOTHER STEP FORWARD'
            : meal
              ? 'FUELING YOUR NEXT CHAPTER'
              : rest
                ? 'RECOVERY IS PART OF THE WORK'
                : 'EFFORT, MEET ENERGY'}
        </span>
        <h2>
          {applied
            ? 'A little stronger.'
            : meal
              ? 'Fuel received.'
              : rest
                ? 'Breathe. Reset.'
                : 'Power in the making.'}
        </h2>
        <div className="celebration-stage">
          <div className="celebration-glow" />
          <Avatar profile={profile} progress={applied ? nextProgress : progress} emote={event} />
          {meal && seconds > 2.65 && seconds < 3.15 && <span className="comic-bubble">burp.</span>}
          {applied && (
            <span className="gains-badge">
              <Check size={14} /> Form updated
            </span>
          )}
        </div>
        <p>
          {applied
            ? 'Your log is saved. Real change takes consistency.'
            : meal
              ? 'A bite. A breather. Back to building.'
              : rest
                ? 'Taking a moment is progress, too.'
                : 'One session closer to your next chapter.'}
        </p>
        <div className="celebration-progress">
          <span style={{ width: `${Math.min(100, (seconds / EMOTE_DURATION) * 100)}%` }} />
        </div>
        <span className="celebration-note">
          A celebration of the habit. Physique changes stay gradual.
        </span>
      </div>
    </div>
  );
}
