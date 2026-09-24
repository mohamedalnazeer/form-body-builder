# FORM — Build yourself.

A local-first physique, nutrition, and workout companion with a customizable, procedural 3D character. React + Vite + Unity WebGL (with shared Three.js previews), with an Express server for optional AI food estimation.

## Run

Requires Node.js 22.12+ (Node.js 24 LTS is installed on this Mac).

```sh
npm install
npm run dev
```

Open **http://localhost:5173**. The first visit shows an explicitly labeled demo. Choose **Create my character** to replace the example journey with your own baseline and empty logs.

For a production build:

```sh
npm run build
npm start
```

The server binds to `127.0.0.1`. This is a single-user local app, not a publicly hosted service with accounts or cloud synchronization.

## What works

- Original anime-style 3D character with Unity toon rendering, front/side/back views, and four starting physique templates.
- Six hairstyles, hair/eye/skin color controls, clothing/accent colors, training kit, fighter gi, tech suit, shirtless shorts, and an unclothed smooth mannequin physique view.
- Bite/chew/burp and workout power-up celebrations, with Skip, reduced-motion support, and an off switch in Settings. Celebrations never award duplicate or instant oversized gains.
- US units by default (lb, inches, fl oz), switchable to metric in the top bar, profile, or Settings. Body metrics, lifting loads, water, and charts convert together without rewriting stored measurements; nutrition macros stay in grams.
- Height, weight, body fat, and optional lean-mass inputs shape the baseline. BMI and lean mass are calculated from entered values. Proportions are stylized rather than a body scan.
- Daily meals with editable calories, protein, carbs, and fats. Add, edit, delete, and browse earlier dates.
- Built-in food estimates with quantity handling and explicit unknown-food warnings. Example: `200g chicken, 150g rice, 2 eggs`.
- Optional AI estimates, reviewed before saving. No AI credential is required to use the rest of the app.
- Push, back/biceps, legs, full-body, cardio, and recovery sessions with editable muscle groups, exercises, sets, reps, loads, duration, and notes.
- Per-muscle gradual character changes, training highlights, baseline/current comparison, streaks, water, activity calendar, and a real-measurement progress chart.
- Adjustable macro and maintenance targets, browser-local persistence, JSON backup export, and validated backup restore.
- Responsive layouts, keyboard-accessible dialogs, local fonts, and a 3D fallback when WebGL is unavailable.

## Unity character viewer

The independent Unity project is in `unity/FormCharacter`. The main viewer loads its WebGL build from `public/unity`; customizer and celebration previews share the same model through Three.js. The current Unity build is approximately 43 MB, so the lightweight preview stays available during the initial download. See [Unity setup and rebuild instructions](unity/README.md). The app remains usable if the larger Unity runtime cannot load.

## Optional AI

Copy `.env.example` to `.env`, add your API key, and restart:

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Choose **Estimate a meal → Use AI**. Only the meal description is sent when you click **Estimate macros**; the character, measurements, and stored history are not sent. The key stays on the server. API usage may incur charges on your account. `.env` is ignored by Git.

The integration uses the OpenAI Responses API with structured JSON output, a timeout, response validation, and a local rate limit. See the [official Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs). Live AI calls require your credential and have not been verified with a real key. Without a key, the built-in generic-food estimator is available and is clearly labeled separately from AI.

## Simulation assumptions

This is an **illustrative game model**, not a validated physiological predictor or an assessment of health. It does not infer actual body composition from food logs, BMI, or exercise names.

- Each trained muscle receives at most one small growth contribution per calendar day. Duplicate sessions do not multiply it.
- Logged protein and energy, experience/template, and consecutive-day training affect that contribution. Per-muscle change is capped.
- Only food days marked **complete** contribute to simulated fat changes. Missing logs and partial days do not imply calorie deficits. The model uses a user-supplied maintenance setting and capped daily changes.
- No permanent instant workout pump is applied. Highlights indicate muscles trained, not immediate size gains.
- Real weight/body-fat check-ins are stored and charted separately. Baseline edits recalculate the simulation; later check-ins do not overwrite the baseline.
- Generic food values vary with brand, recipe, and preparation. Cooked weights are assumed for meat, rice, potatoes, and pasta; use package labels when available.

All targets in the demo are examples. The model does not account for factors such as genetics, actual training stimulus, medications, or unlogged activity.

## Tests

```sh
npm test
# With the app running, and Google Chrome installed:
npm run test:e2e
```

Unit tests cover growth caps, incomplete logs, recovery, calendar boundaries, food quantities, and invalid backups. Browser tests use isolated disposable browser storage and cover navigation, WebGL rendering, meal CRUD/persistence, workouts, check-ins, fresh setup, and phone layouts. Screenshots and failure traces are written to `test-results/`.

## Project map

| File                   | Purpose                                                     |
| ---------------------- | ----------------------------------------------------------- |
| `src/App.jsx`          | Dashboard, navigation, daily logs, progress, persistence    |
| `src/Avatar.jsx`       | Lightweight previews of the shared character model |
| `src/UnityAvatar.jsx` | Unity loader, local character bridge, orbit, fallback |
| `src/character/` | Shared anatomy, hair/clothing geometry, animation poses |
| `src/units.js` | Canonical measurement conversions |
| `unity/FormCharacter/` | Editable Unity project, runtime renderer, toon shader |
| `src/Modals.jsx`       | Meal, workout, character, check-in, and settings flows      |
| `src/domain.js`        | Calendar, macro totals, simulation, demo, backup validation |
| `src/styles.css`       | Responsive visual system                                    |
| `server/index.mjs`     | Local server, built-in / optional AI endpoints              |
| `server/nutrition.mjs` | Generic-food parsing and estimate validation                |

Browser data stays on this device and origin. Export a backup before clearing site data, switching ports, or moving to another device.
