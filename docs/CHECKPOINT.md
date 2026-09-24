# FORM checkpoint — September 24, 2026

This checkpoint preserves the working 3D prototype before any future art-direction change.

## Current version

- Nutrition and workout logging, food estimates, optional server-side AI estimates.
- Conservative illustrative physique progression, check-ins, calendar, backups.
- US and metric measurements with canonical storage and precision-preserving conversion.
- Original anime-style procedural character, hair/colors/outfits and mannequin physique view.
- Meal and workout celebrations; skippable and reduced-motion aware.
- Unity 6000.6.2f1 / URP WebGL main viewer in an isolated same-origin frame; Three.js previews.
- Unity build queue waits for script compilation and imports before building.

Validation at this checkpoint: 15 unit tests passed; 11 app browser tests passed in the production suite, and the Unity integration test passed separately after the keyboard-isolation fix. Production web build and Unity WebGL build succeeded.

## Next direction (not implemented)

The user wants to explore a 2D pixel-art character style later. Preserve this checkpoint; make the future 2D work in a new branch. No 2D rewrite is part of this save.

## Restoring

Run `npm ci` and `npm run dev`. Source code and Unity assets/settings are in Git. Generated dependencies, Unity caches, credentials, and test output are excluded.

The checkpoint release includes `form-unity-viewer.zip`. Extract it at the repository root to restore `public/unity/` without rebuilding Unity. Alternatively, follow `unity/README.md` to rebuild the viewer. Without the Unity build, the app uses the lightweight character renderer.

Meal logs and personal measurements are stored in browser localStorage, not source files. Use Settings → Export backup in the app to move those to another device. Optional API keys belong in the untracked `.env` file.
