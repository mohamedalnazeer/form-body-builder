---
name: debugging
description: Diagnose frontend and Unity integration issues systematically.
---

# Debugging

Trace problems from the user-visible symptom to the smallest responsible boundary.

- Reproduce the issue with the smallest reliable command or browser test.
- Check browser console/runtime errors, network or asset paths, and state transitions before changing code.
- For Unity WebGL issues, verify generated files under `public/unity` and the React embedding lifecycle separately.
- Prefer adding a temporary focused diagnostic or test over speculative logging throughout the app.
- Remove temporary diagnostics after the root cause is fixed and verify the original reproduction no longer fails.

