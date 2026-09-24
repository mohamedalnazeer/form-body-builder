---
name: testing
description: Design and run focused tests for the React/Vite app and Playwright browser suite.
---

# Testing

Use the existing Playwright configuration and tests before adding new tooling.

- Inspect the affected component, domain helper, and nearby browser specs before editing.
- Prefer a focused Playwright test for user-visible behavior and a small unit-level test only when the logic is isolated and reusable.
- Keep tests deterministic: use accessible locators, stable app state, and explicit waits for observable conditions.
- Run the narrowest relevant command first, then the full browser suite when shared behavior or configuration changes.
- Report failures with the exact command, failing test, and whether the failure is environmental or caused by the change.

