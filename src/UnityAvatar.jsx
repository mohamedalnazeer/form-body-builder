import React, { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar.jsx';
import { buildCharacter } from './character/geometry.js';

// A same-origin frame keeps Unity's global input listeners out of React's forms.
// Only this local renderer receives character recipes; no cloud service is involved.
export default function UnityAvatar({
  profile,
  progress,
  view = 'front',
  highlight = [],
  resetToken = 0,
  emote,
}) {
  const frame = useRef(null),
    instance = useRef(null),
    latest = useRef(null);
  const [ready, setReady] = useState(false),
    [loading, setLoading] = useState(null);
  const recipe = useMemo(() => {
    const result = buildCharacter(profile, progress);
    if (highlight.length)
      result.meshes.forEach((m) => {
        if (highlight.includes(m.group)) m.color = '#c5e999';
      });
    return JSON.stringify(result);
  }, [profile, progress, highlight.join(',')]);
  latest.current = { recipe, view, emote };
  useEffect(() => {
    let disposed = false,
      local;
    if (new URLSearchParams(location.search).get('renderer') === 'web') return;
    (async () => {
      try {
        const response = await fetch('/unity/manifest.json');
        if (!response.ok) return;
        const config = await response.json();
        if (disposed) return;
        setLoading(0);
        const win = frame.current.contentWindow,
          doc = win.document;
        doc.open();
        doc.write(
          '<!doctype html><html><head><title>FORM character</title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#11150f}canvas{display:block;width:100%;height:100%;touch-action:pan-y;outline:none}canvas:focus-visible{outline:1px solid #d6ed86;outline-offset:-4px}</style></head><body><canvas id="form-unity-canvas" tabindex="0" aria-label="Anime character. Drag or use arrow keys to rotate."></canvas></body></html>',
        );
        doc.close();
        const canvas = doc.getElementById('form-unity-canvas');
        let drag = null;
        canvas.addEventListener('pointerdown', (e) => {
          drag = e.clientX;
          canvas.setPointerCapture(e.pointerId);
        });
        canvas.addEventListener('pointermove', (e) => {
          if (drag === null) return;
          const delta = e.clientX - drag;
          drag = e.clientX;
          local?.SendMessage('FormCharacter', 'SetOrbit', String(delta * 0.4));
        });
        for (const event of ['pointerup', 'pointercancel'])
          canvas.addEventListener(event, () => {
            drag = null;
          });
        canvas.addEventListener('keydown', (e) => {
          if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            local?.SendMessage('FormCharacter', 'SetOrbit', e.key === 'ArrowLeft' ? '-15' : '15');
          }
        });
        await new Promise((resolve, reject) => {
          const script = doc.createElement('script');
          script.src = config.loaderUrl;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Unity loader unavailable'));
          doc.head.appendChild(script);
        });
        if (disposed) return;
        local = await win.createUnityInstance(
          canvas,
          {
            ...config,
            companyName: 'FORM',
            productName: 'FORM Character',
            productVersion: '1.0',
            devicePixelRatio: Math.min(devicePixelRatio, 1.5),
            showBanner: (message, type) =>
              console[type === 'error' ? 'error' : 'warn']('Unity: ' + message),
          },
          (n) => {
            if (!disposed) setLoading(Math.round(n * 100));
          },
        );
        if (disposed) {
          await local.Quit();
          return;
        }
        instance.current = local;
        local.SendMessage('FormCharacter', 'SetCharacter', latest.current.recipe);
        local.SendMessage('FormCharacter', 'SetView', latest.current.view);
        local.SendMessage(
          'FormCharacter',
          'SetReducedMotion',
          String(matchMedia('(prefers-reduced-motion: reduce)').matches),
        );
        setReady(true);
        setLoading(null);
      } catch (error) {
        if (!disposed) {
          setLoading(null);
          setReady(false);
        }
        console.warn(
          'FORM is using the lightweight character viewer.',
          error?.message || String(error),
        );
      }
    })();
    return () => {
      disposed = true;
      instance.current = null;
      if (local) local.Quit().catch(() => {});
    };
  }, []);
  useEffect(() => {
    instance.current?.SendMessage('FormCharacter', 'SetCharacter', recipe);
  }, [recipe]);
  useEffect(() => {
    instance.current?.SendMessage('FormCharacter', 'SetView', view);
  }, [view, resetToken]);
  useEffect(() => {
    instance.current?.SendMessage('FormCharacter', 'PlayEmote', emote?.kind || '');
  }, [emote?.id]);
  return (
    <div className="unity-viewport" data-renderer={ready ? 'unity' : 'web'}>
      {!ready && (
        <Avatar
          profile={profile}
          progress={progress}
          view={view}
          highlight={highlight}
          emote={emote}
        />
      )}
      <iframe
        ref={frame}
        title="Unity character viewer"
        className={`unity-overlay ${ready ? 'ready' : ''}`}
        style={{
          visibility: ready ? 'visible' : 'hidden',
          width: '100%',
          height: '100%',
          border: 0,
        }}
        tabIndex={ready ? 0 : -1}
      />
      {loading !== null && <span className="unity-loading">Loading Unity · {loading}%</span>}
      <span className="renderer-label">{ready ? 'UNITY · TOON' : '3D · TOON'}</span>
    </div>
  );
}
